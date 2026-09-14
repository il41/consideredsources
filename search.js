/* Considered Sources — client-side search */

(function () {
  var searchData = [];
  var fuseLoaded = false;
  var BASE_PATH = window.BASE_PATH || "/";

  function loadFuse(callback) {
    if (typeof fuse !== "undefined") {
      fuseLoaded = true;
      if (callback) callback();
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js";
    script.onload = function () {
      fuseLoaded = true;
      if (callback) callback();
    };
    document.head.appendChild(script);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function highlight(text, indices) {
    /* Wrap matched ranges in <mark>, using Fuse.js index pairs. */
    if (!indices || !indices.length) return escapeHtml(text);
    var out = "";
    var last = 0;
    for (var i = 0; i < indices.length; i++) {
      var start = indices[i][0];
      var end = indices[i][1] + 1;
      if (start > text.length) break;
      if (end > text.length) end = text.length;
      out += escapeHtml(text.slice(last, start));
      out += "<mark>" + escapeHtml(text.slice(start, end)) + "</mark>";
      last = end;
    }
    out += escapeHtml(text.slice(last));
    return out;
  }

  function buildExcerpt(item, textMatches) {
    var text = item.text || "";
    if (!text) return "";
    if (textMatches && textMatches.length) {
      var first = textMatches[0].indices[0][0];
      var windowStart = Math.max(0, first - 60);
      var windowEnd = Math.min(text.length, windowStart + 220);
      var window = text.slice(windowStart, windowEnd);
      var adjusted = [];
      for (var i = 0; i < textMatches.length; i++) {
        for (var j = 0; j < textMatches[i].indices.length; j++) {
          var s = textMatches[i].indices[j][0] - windowStart;
          var e = textMatches[i].indices[j][1] - windowStart;
          if (e >= 0 && s < window.length) {
            adjusted.push([Math.max(0, s), Math.min(window.length - 1, e)]);
          }
        }
      }
      var prefix = windowStart > 0 ? "…" : "";
      var suffix = windowEnd < text.length ? "…" : "";
      return prefix + highlight(window, adjusted) + suffix;
    }
    return escapeHtml(text.substring(0, 200));
  }

  function initSearch(inputEl, resultsEl) {
    if (!inputEl) return;

    fetch(BASE_PATH + "search.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        searchData = data;
        inputEl.style.display = "";
        inputEl.placeholder = "Search " + data.length + " posts…";
      });

    inputEl.addEventListener("input", function () {
      var q = inputEl.value.trim();
      if (q.length < 2) {
        resultsEl.innerHTML = "";
        return;
      }
      if (!fuseLoaded) {
        resultsEl.innerHTML =
          '<div class="search-status">Loading search index…</div>';
        return;
      }
      performSearch(q, resultsEl);
    });
  }

  function performSearch(q, resultsEl) {
    var fuse = new Fuse(searchData, {
      keys: ["title", "text", "categories", "tags"],
      threshold: 0.4,
      includeMatches: true,
      includeScore: true,
    });
    var results = fuse.search(q);
    if (results.length === 0) {
      resultsEl.innerHTML =
        '<div class="search-status">No results found.</div>';
      return;
    }
    var html = "";
    for (var i = 0; i < Math.min(results.length, 30); i++) {
      var result = results[i];
      var r = result.item;
      var titleHtml = escapeHtml(r.title);
      var excerptHtml = "";
      var textMatches = null;
      var titleMatches = null;

      if (result.matches) {
        for (var k = 0; k < result.matches.length; k++) {
          if (result.matches[k].key === "title") titleMatches = result.matches[k];
          if (result.matches[k].key === "text") textMatches = result.matches[k];
        }
      }
      if (titleMatches) {
        titleHtml = highlight(r.title, titleMatches.indices);
      }
      if (textMatches) {
        excerptHtml = buildExcerpt(r, textMatches);
      } else {
        excerptHtml = r.text ? escapeHtml(r.text.substring(0, 200)) : "";
      }

      html +=
        '<li class="search-result-item">' +
        '<a href="' + r.url + '" class="search-result-title">' + titleHtml + "</a>" +
        '<span class="search-result-date">' + escapeHtml(r.date) + "</span>" +
        (excerptHtml
          ? '<div class="search-result-excerpt">' + excerptHtml + "</div>"
          : "") +
        "</li>";
    }
    resultsEl.innerHTML = html;
  }

  function addSearchToPage() {
    var main = document.querySelector("main");
    if (!main) return;

    var container = document.createElement("div");
    container.className = "search-container";

    var input = document.createElement("input");
    input.type = "search";
    input.className = "search-input";
    input.style.display = "none";
    container.appendChild(input);

    var results = document.createElement("ul");
    results.className = "search-results";
    container.appendChild(results);

    var firstSection = main.querySelector("section");
    if (firstSection) {
      main.insertBefore(container, firstSection);
    } else {
      main.insertBefore(container, main.firstChild);
    }

    loadFuse(function () {
      initSearch(input, results);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addSearchToPage);
  } else {
    addSearchToPage();
  }
})();
