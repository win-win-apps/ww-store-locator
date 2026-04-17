/* WW Store Locator — vanilla storefront engine.
 *
 * Reads window.WWStoreLocator injected by embed.liquid. Finds every
 * `.ww-store-locator` element on the page, builds a full locator widget
 * inside it (sidebar with search + list, google map with markers), and
 * wires up search-by-zip, radius filter, tag filter, directions links.
 *
 * No external libraries except the Google Maps JS API which is loaded
 * async with the merchant-provided key.
 */

(function () {
  var data = window.WWStoreLocator;
  if (!data || !data.config) {
    console.warn("[ww-store-locator] no config, aborting");
    return;
  }

  var config = data.config || {};
  var locations = (data.locations || []).filter(function (l) {
    return l.lat !== null && l.lng !== null;
  });

  var apiKey = config.googleMapsApiKey;
  if (!apiKey) {
    console.warn("[ww-store-locator] no google maps API key set");
    // Show a visible message on any mount points so merchants know what's wrong
    document.querySelectorAll(".ww-store-locator").forEach(function (m) {
      m.innerHTML =
        '<div style="padding:40px 20px;text-align:center;color:#6b7280;font-family:inherit;">' +
        '<p style="font-size:1rem;font-weight:600;margin:0 0 8px;">Store locator is almost ready</p>' +
        '<p style="font-size:0.85rem;margin:0;">The store owner needs to add a Google Maps API key in the app settings.</p>' +
        "</div>";
    });
    return;
  }

  var mounts = [];
  function findMounts() {
    mounts = Array.prototype.slice.call(
      document.querySelectorAll(".ww-store-locator")
    );
  }

  function init() {
    findMounts();
    if (mounts.length === 0) return;
    loadGoogleMaps(apiKey, function () {
      mounts.forEach(function (mount) {
        renderWidget(mount);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function loadGoogleMaps(key, cb) {
    if (window.google && window.google.maps) {
      cb();
      return;
    }
    if (window.__wwslMapsLoading) {
      var wait = setInterval(function () {
        if (window.google && window.google.maps) {
          clearInterval(wait);
          cb();
        }
      }, 100);
      return;
    }
    window.__wwslMapsLoading = true;
    window.__wwslMapsReady = cb;
    var s = document.createElement("script");
    s.src =
      "https://maps.googleapis.com/maps/api/js?key=" +
      encodeURIComponent(key) +
      "&callback=__wwslMapsReadyCallback&libraries=geometry";
    s.async = true;
    s.defer = true;
    window.__wwslMapsReadyCallback = function () {
      window.__wwslMapsLoading = false;
      if (window.__wwslMapsReady) window.__wwslMapsReady();
    };
    document.head.appendChild(s);
  }

  function renderWidget(mount) {
    mount.innerHTML = "";
    mount.style.setProperty("--wwsl-primary", config.primaryColor || "#1f2937");

    var wrapper = el("div", "wwsl-wrapper");

    var header = el("div", "wwsl-header");
    var h2 = el("h2");
    h2.textContent = config.pageTitle || "Find a Store";
    header.appendChild(h2);
    if (config.introText) {
      var p = el("p");
      p.textContent = config.introText;
      header.appendChild(p);
    }
    wrapper.appendChild(header);

    var sidebar = el("div", "wwsl-sidebar");
    var controls = el("div", "wwsl-controls");

    var zipState = { zip: "", center: null, radius: config.defaultRadius || 25 };
    var filters = { tag: "" };

    if (config.showSearchBar) {
      var searchRow = el("div", "wwsl-search");
      var input = el("input");
      input.type = "text";
      input.placeholder = "Enter zip or city";
      input.setAttribute("aria-label", "Search by zip or city");
      var btn = el("button");
      btn.type = "button";
      btn.textContent = "Search";
      btn.addEventListener("click", function () {
        zipState.zip = input.value.trim();
        searchZip();
      });
      input.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") {
          ev.preventDefault();
          zipState.zip = input.value.trim();
          searchZip();
        }
      });
      searchRow.appendChild(input);
      searchRow.appendChild(btn);
      controls.appendChild(searchRow);
    }

    if (config.showRadiusFilter || config.showTagFilter) {
      var filterRow = el("div", "wwsl-filter-row");

      if (config.showRadiusFilter) {
        var radiusWrap = el("div", "wwsl-radius");
        var radiusLabel = el("span", "wwsl-label");
        radiusLabel.textContent = "Radius";
        var radiusSel = el("select");
        radiusSel.setAttribute("aria-label", "Search radius");
        [5, 10, 25, 50, 100, 250].forEach(function (r) {
          var o = el("option");
          o.value = String(r);
          o.textContent = r + " " + (config.radiusUnit || "mi");
          if (r === (config.defaultRadius || 25)) o.selected = true;
          radiusSel.appendChild(o);
        });
        radiusSel.addEventListener("change", function () {
          zipState.radius = Number(radiusSel.value);
          render();
        });
        radiusWrap.appendChild(radiusLabel);
        radiusWrap.appendChild(radiusSel);
        filterRow.appendChild(radiusWrap);
      }

      if (config.showTagFilter) {
        var allTags = {};
        locations.forEach(function (l) {
          (l.tags || []).forEach(function (t) {
            allTags[t] = true;
          });
        });
        var tagKeys = Object.keys(allTags);
        if (tagKeys.length > 0) {
          var tagWrap = el("div", "wwsl-tags");
          var tagLabel = el("span", "wwsl-label");
          tagLabel.textContent = "Service";
          var tagSel = el("select");
          tagSel.setAttribute("aria-label", "Filter by service");
          var blank = el("option");
          blank.value = "";
          blank.textContent = "All services";
          tagSel.appendChild(blank);
          tagKeys.forEach(function (t) {
            var o = el("option");
            o.value = t;
            o.textContent = t;
            tagSel.appendChild(o);
          });
          tagSel.addEventListener("change", function () {
            filters.tag = tagSel.value;
            render();
          });
          tagWrap.appendChild(tagLabel);
          tagWrap.appendChild(tagSel);
          filterRow.appendChild(tagWrap);
        }
      }

      if (filterRow.childNodes.length > 0) {
        controls.appendChild(filterRow);
      }
    }

    sidebar.appendChild(controls);

    var count = el("div", "wwsl-count");
    sidebar.appendChild(count);

    var list = el("ul", "wwsl-list");
    sidebar.appendChild(list);

    wrapper.appendChild(sidebar);

    var mapDiv = el("div", "wwsl-map");
    wrapper.appendChild(mapDiv);

    mount.appendChild(wrapper);

    var map = new google.maps.Map(mapDiv, {
      center: {
        lat: config.defaultLat || 39.5,
        lng: config.defaultLng || -98.35,
      },
      zoom: config.defaultZoom || 4,
      styles: getMapStyle(config.mapStyle),
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });

    var infoWindow = new google.maps.InfoWindow();
    var markers = [];

    function render() {
      // Clear markers
      markers.forEach(function (m) {
        m.setMap(null);
      });
      markers = [];
      list.innerHTML = "";

      var filtered = locations.slice();

      // tag filter
      if (filters.tag) {
        filtered = filtered.filter(function (l) {
          return (l.tags || []).indexOf(filters.tag) !== -1;
        });
      }

      // distance filter
      if (zipState.center) {
        filtered = filtered
          .map(function (l) {
            l._distance = distanceBetween(zipState.center, {
              lat: l.lat,
              lng: l.lng,
            });
            return l;
          })
          .filter(function (l) {
            var maxM = zipState.radius * (config.radiusUnit === "km" ? 1000 : 1609.34);
            return l._distance <= maxM;
          })
          .sort(function (a, b) {
            return a._distance - b._distance;
          });
      }

      if (filtered.length === 0) {
        count.textContent = "";
        var empty = el("li", "wwsl-empty");
        empty.textContent =
          zipState.center
            ? "No stores within " + zipState.radius + " " + (config.radiusUnit || "mi")
            : "No stores match those filters";
        list.appendChild(empty);
        return;
      }

      count.textContent =
        filtered.length + " store" + (filtered.length === 1 ? "" : "s");

      var bounds = new google.maps.LatLngBounds();

      filtered.forEach(function (loc, index) {
        var pos = { lat: loc.lat, lng: loc.lng };

        var marker = new google.maps.Marker({
          position: pos,
          map: map,
          title: loc.name,
          icon: buildPinIcon(config.pinColor || "#e53935", index + 1),
        });

        marker.addListener("click", function () {
          infoWindow.setContent(buildInfoContent(loc));
          infoWindow.open(map, marker);
          highlightListItem(loc.id);
        });

        markers.push(marker);
        bounds.extend(pos);

        var item = buildListItem(loc, index + 1);
        item.addEventListener("click", function () {
          map.panTo(pos);
          map.setZoom(Math.max(map.getZoom(), 12));
          infoWindow.setContent(buildInfoContent(loc));
          infoWindow.open(map, marker);
          highlightListItem(loc.id);
        });
        list.appendChild(item);
      });

      if (zipState.center) {
        bounds.extend(zipState.center);
      }
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds);
        google.maps.event.addListenerOnce(map, "idle", function () {
          if (map.getZoom() > 14) map.setZoom(14);
        });
      }
    }

    function highlightListItem(id) {
      list.querySelectorAll(".wwsl-list-item").forEach(function (n) {
        if (n.dataset.id === id) n.classList.add("wwsl-active");
        else n.classList.remove("wwsl-active");
      });
    }

    function searchZip() {
      if (!zipState.zip) {
        zipState.center = null;
        render();
        return;
      }
      var geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: zipState.zip }, function (results, status) {
        if (status === "OK" && results[0]) {
          var loc = results[0].geometry.location;
          zipState.center = { lat: loc.lat(), lng: loc.lng() };
          render();
        } else {
          count.textContent = "Could not find that location";
          render();
        }
      });
    }

    function buildListItem(loc, index) {
      var item = el("li", "wwsl-list-item");
      item.dataset.id = loc.id;
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", "View " + loc.name + " on map");
      item.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          item.click();
        }
      });

      var h3 = el("h3");
      h3.textContent = index + ". " + loc.name;
      item.appendChild(h3);

      if (loc._distance !== undefined) {
        var d = el("div", "wwsl-distance");
        var miles = loc._distance / 1609.34;
        var km = loc._distance / 1000;
        d.textContent =
          config.radiusUnit === "km"
            ? km.toFixed(1) + " km away"
            : miles.toFixed(1) + " mi away";
        item.appendChild(d);
      }

      var addr = el("div", "wwsl-addr");
      addr.textContent = loc.address;
      item.appendChild(addr);

      if (config.showPhone && loc.phone) {
        var phone = el("a", "wwsl-phone");
        phone.href = "tel:" + loc.phone.replace(/[^+\d]/g, "");
        phone.textContent = loc.phone;
        item.appendChild(phone);
      }

      if ((loc.tags || []).length > 0) {
        var tagBox = el("div");
        (loc.tags || []).forEach(function (t) {
          var tag = el("span", "wwsl-tag-badge");
          tag.textContent = t;
          tagBox.appendChild(tag);
        });
        item.appendChild(tagBox);
      }

      if (config.showDirections) {
        var actions = el("div", "wwsl-actions");
        var dirBtn = el("a", "wwsl-btn");
        dirBtn.href =
          "https://www.google.com/maps/dir/?api=1&destination=" +
          encodeURIComponent(loc.address);
        dirBtn.target = "_blank";
        dirBtn.rel = "noopener";
        dirBtn.textContent = "Get directions";
        actions.appendChild(dirBtn);
        if (loc.website) {
          var webBtn = el("a", "wwsl-btn");
          webBtn.href = loc.website;
          webBtn.target = "_blank";
          webBtn.rel = "noopener";
          webBtn.textContent = "Website";
          actions.appendChild(webBtn);
        }
        item.appendChild(actions);
      }

      if (config.showHours && loc.hours && Object.keys(loc.hours).length > 0) {
        var nowBadge = computeOpenNow(loc.hours);
        if (nowBadge) {
          item.querySelector("h3").appendChild(nowBadge);
        }
        var hoursBox = el("div", "wwsl-hours");
        renderHours(hoursBox, loc.hours);
        item.appendChild(hoursBox);
      }

      return item;
    }

    function buildInfoContent(loc) {
      var safe = function (s) {
        return String(s || "").replace(/[&<>]/g, function (c) {
          return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
        });
      };
      var html =
        '<div style="font-family: inherit; max-width: 260px;">' +
        '<strong style="font-size: 0.95rem;">' +
        safe(loc.name) +
        "</strong><br/>" +
        '<span style="font-size: 0.82rem; color: #6b7280;">' +
        safe(loc.address) +
        "</span>";
      if (config.showPhone && loc.phone) {
        html +=
          '<br/><a href="tel:' +
          safe(loc.phone.replace(/[^+\d]/g, "")) +
          '" style="color: inherit; text-decoration: none; font-size: 0.85rem;">' +
          safe(loc.phone) +
          "</a>";
      }
      if (config.showDirections) {
        html +=
          '<br/><br/><a href="https://www.google.com/maps/dir/?api=1&destination=' +
          encodeURIComponent(loc.address) +
          '" target="_blank" rel="noopener" style="color: ' +
          (config.primaryColor || "#1f2937") +
          '; font-size: 0.85rem;">Get directions →</a>';
      }
      html += "</div>";
      return html;
    }

    render();
  }

  function renderHours(node, hours) {
    var dayOrder = [
      ["mon", "Mon"],
      ["tue", "Tue"],
      ["wed", "Wed"],
      ["thu", "Thu"],
      ["fri", "Fri"],
      ["sat", "Sat"],
      ["sun", "Sun"],
    ];
    dayOrder.forEach(function (pair) {
      var row = el("div", "wwsl-hours-row");
      var lbl = el("span");
      lbl.textContent = pair[1];
      var val = el("span");
      var h = hours[pair[0]];
      if (!h) {
        val.textContent = "Closed";
      } else if (h.closed) {
        val.textContent = "Closed";
      } else {
        val.textContent = (h.open || "") + " – " + (h.close || "");
      }
      row.appendChild(lbl);
      row.appendChild(val);
      node.appendChild(row);
    });
  }

  function computeOpenNow(hours) {
    var now = new Date();
    var daysKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    var k = daysKey[now.getDay()];
    var h = hours[k];
    if (!h || h.closed) {
      var badge = el("span", "wwsl-closed-now");
      badge.textContent = "Closed";
      return badge;
    }
    var cur = now.getHours() * 60 + now.getMinutes();
    function parseT(s) {
      var parts = String(s || "").split(":");
      return Number(parts[0] || 0) * 60 + Number(parts[1] || 0);
    }
    var o = parseT(h.open);
    var c = parseT(h.close);
    if (cur >= o && cur <= c) {
      var b = el("span", "wwsl-open-now");
      b.textContent = "Open now";
      return b;
    }
    var cb = el("span", "wwsl-closed-now");
    cb.textContent = "Closed";
    return cb;
  }

  function distanceBetween(a, b) {
    // Haversine, returns meters
    var R = 6371000;
    var toRad = function (x) {
      return (x * Math.PI) / 180;
    };
    var dLat = toRad(b.lat - a.lat);
    var dLon = toRad(b.lng - a.lng);
    var s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    return R * c;
  }

  function buildPinIcon(color, num) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">' +
      '<path fill="' +
      color +
      '" stroke="#fff" stroke-width="1.5" d="M16 0C7.2 0 0 7.2 0 16c0 12 16 28 16 28s16-16 16-28C32 7.2 24.8 0 16 0z"/>' +
      '<circle cx="16" cy="16" r="10" fill="#fff"/>' +
      '<text x="16" y="21" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="' +
      color +
      '">' +
      num +
      "</text>" +
      "</svg>";
    return {
      url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(32, 44),
      anchor: new google.maps.Point(16, 44),
    };
  }

  function getMapStyle(style) {
    var styles = {
      standard: [],
      silver: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        {
          elementType: "labels.text.fill",
          stylers: [{ color: "#616161" }],
        },
        {
          elementType: "labels.text.stroke",
          stylers: [{ color: "#f5f5f5" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#ffffff" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#c9c9c9" }],
        },
      ],
      dark: [
        { elementType: "geometry", stylers: [{ color: "#212121" }] },
        { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        {
          elementType: "labels.text.fill",
          stylers: [{ color: "#757575" }],
        },
        {
          elementType: "labels.text.stroke",
          stylers: [{ color: "#212121" }],
        },
        {
          featureType: "road",
          elementType: "geometry",
          stylers: [{ color: "#383838" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#000000" }],
        },
      ],
      retro: [
        { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
        {
          elementType: "labels.text.fill",
          stylers: [{ color: "#523735" }],
        },
        {
          elementType: "labels.text.stroke",
          stylers: [{ color: "#f5f1e6" }],
        },
        {
          featureType: "water",
          elementType: "geometry",
          stylers: [{ color: "#b9d3c2" }],
        },
      ],
    };
    return styles[style] || styles.standard;
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }
})();
