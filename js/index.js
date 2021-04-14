/* jshint esversion: 6 */
/* jshint browser: true */
/* jslint devel: true */

(function () {
  /* Set the theme before the document loads to stop the page from flashing white. */
  setTheme();
  /* A dictionary that consists of the url(key), and the vertical scrol position (value). */
  let verticalScrollPositionHistory = [];
  /* Remember the last known vertical scrolling postion using the popstate event because the 
    hashchange event reports the wrong vertical scrolling positon. */
  let lastVerticalScrollPosition = 0;
  /* The number of articles to load on the home page. */
  const limit = 10;
  /* Used to cancel fetching events. */
  let controller = new AbortController();
  let signal = controller.signal;

  window.addEventListener('load', onLoad);
  document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
  window.addEventListener('hashchange', onHashChangeEvent);
  window.addEventListener('popstate', onPopStateEvent);
  document
    .getElementById('theme')
    .addEventListener('click', onThemeButtonClicked);

  /**
   * Set theme and load articles.
   */
  function onLoad() {
    const page = getHash(document.location);
    const theme = getTheme(document.location);

    if (!theme) {
      document.location.search = 'theme=light';
    } else {
      setThemeButtonText();
    }

    if (!page) {
      document.location.hash = '#home';
    } else if (page === 'home') {
      showHome();
    } else {
      showArticle(page);
    }

    document.title = getTitle(document.location.hash);
  }

  /**
   * Initialise burger, navbar items, and go to top button.
   */
  function onDOMContentLoaded() {
    initBurger();
    initNavbarItems();
    initGoToTopButton();
  }

  /**
   * Add click listener tonavbar-burger button.
   */
  function initBurger() {
    document.querySelector('.navbar-burger').addEventListener('click', function (e) {
      e.currentTarget.classList.toggle('is-active');
      document
        .getElementById(e.currentTarget.dataset.target)
        .classList.toggle('is-active');
    });
  }

  /**
   * When the user clicks on the logo or any of the navbar items, close the burger menu.
   */
  function initNavbarItems() {
    Array.from(document.getElementsByClassName('navbar-item')).forEach(
      (item) => {
        item.addEventListener('click', function (e) {
          const burger = document.querySelector('.navbar-burger');
          burger.classList.remove('is-active');
          document
            .getElementById(burger.dataset.target)
            .classList.remove('is-active');
        });
      }
    );
  }

  /**
   * Add click listener to go-to-top button. If an error occurs try to remove the go-to-top button.
   */
  function initGoToTopButton() {
    document
      .getElementById('go-to-top')
      .addEventListener('click', function () {
        /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY,
        the returned value is mostly scrollMaxY. To prevent this, we just need to set either at
        1 or window.scrollMaxY - 1. */
        window.scrollTo(0, 1);
      });
  }

  /**
   * Add click listeners to home items.
   */
  function initHome() {
    Array.from(document.getElementsByClassName('card')).forEach((card) => {
      card.addEventListener('click', function (e) {
        document.location.hash = e.currentTarget
          .getAttribute('url')
          .split('/')
          .pop()
          .replace('.html', '');
      });
    });
  }

  /**
   * Remember the scroll position and run onLoad.
   *
   * @param Event event
   */
  function onHashChangeEvent(event) {
    setVerticalScrollPosition(
      getHash(event.oldURL),
      lastVerticalScrollPosition
    );
    onLoad();
  }

  /**
   * When the user navigates, remember the vertical scroll position.
   * If we the hashchange event, it reports the wrong vertical scroll postion when the user
   * is close to the limits of the vertical scroll. Popstate is called before hashchange.
   */
  function onPopStateEvent() {
    lastVerticalScrollPosition = window.scrollY;
  }

  /**
   * Show the article based on the given page name.
   *
   * @param String page
   */
  function showArticle(page) {
    get(
      `https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/${page}.html`
    ).then((html) => {
      showContent(html, false);

      if (page === 'archives') {
        initHome();
      }
    });
  }

  /**
   * Show the home page content.
   * Show the standalone critical error page if an error occurs.
   */
  function showHome() {
    get(
      'https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json'
    ).then((json) =>
      Promise.all(parseArticles(json), false).then(() => {
        setTheme();
        scrollToY(
          getHash(document.location.hash),
          verticalScrollPositionHistory
        );
        initHome();
      })
    );
  }

  /**
   * Parse the articles.json file and display it in content.
   *
   * @param String json
   *
   * @return Promise[]
   */
  function parseArticles(json) {
    // Clear out existing content.
    showContent('', false);

    let jobs = [];

    JSON.parse(json)
      .slice(0, limit)
      .forEach((article) =>
        jobs.push(
          get(article.url)
            .then((html) => createHomeItem(html, article.url))
            .then((article) => showContent(article, true))
        )
      );

    return jobs;
  }
  /**
   * Replace inner html of content with the new content html. Then scroll to the last known y position if it exists.
   *
   * @param String html
   */
  function showContent(html, append) {
    let content = document.getElementById('content');

    if (append) {
      content.insertAdjacentHTML('afterbegin', html);
    } else {
      content.innerHTML = html;
      setTheme();
      scrollToY(
        getHash(document.location),
        verticalScrollPositionHistory
      );
    }
  }

  /**
   * Scroll the the last known scroll y value given a hash and the hash history.
   * If hash is not in the hash history, then scroll to the top.
   *
   * @param String hash
   * @param Object history
   */
  function scrollToY(hash, history) {
    if (hash in history) {
      window.scrollTo(0, history[hash]);
    } else {
      /* There is a bug in chrome where scrolling to the top somehow causes it the window.scrollY to
      be equal to window.scrollMaxY. This might be due to an overflow of some kind? */
      window.scrollTo(0, 1);
    }
  }

  /**
   * Get a resource from the given url.
   *
   * @param String url
   *
   * @return String
   */
  function get(url) {
    return fetch(url, { signal })
      .then((response) => response.text());
  }

  /**
   * Create a home item which is a shortened version of the actual article.
   * Returns an empty string on error.
   *
   * @param String html
   * @param String url
   *
   * @return String
   */
  function createHomeItem(html, url) {
    // Create a temp element so we can store the article inside and transform it into a home item.
    let temp = document.createElement('temp');
    temp.insertAdjacentHTML('afterbegin', html);

    /* Add interactive classes. */
    temp.querySelector('.card').classList.add('is-clickable', 'grow');

    /* Transform the article into a home item by removing all but the first paragraph. */
    let paragraphs = temp.querySelectorAll('.content p div');

    for (let i = 0; i < paragraphs.length; i++) {
      if (i === 0) {
        paragraphs[i].classList.add('truncate');
      } else {
        paragraphs[i].remove();
      }
    }

    // Add url as an attribute so that when they click on it, an event will allow themn to navigate to the article.
    temp.querySelector('.card').setAttribute('url', url);

    return temp.innerHTML;
  }

  /**
   * Switch theme between light and dark when clicked.
   * Theme set to light when error occurs.
   */
  function onThemeButtonClicked() {
    let theme = 'theme=light';

    if (getTheme(document.location) === 'light') {
      theme = 'theme=dark';
    }

    document.location.search = theme;
  }

  /**
   * Store the vertical scroll position.
   *
   * @param String page
   * @param Number lastVerticalScrollPosition
   */
  function setVerticalScrollPosition(page, lastVerticalScrollPosition) {
    verticalScrollPositionHistory[page] = getVerticalScrollPosition(
      lastVerticalScrollPosition
    );
  }

  /**
   * Get the adjusted vertical scroll position value based on the
   * given vertical scroll postision.
   *
   * @param String lastVerticalScrollPosition
   *
   * @return String
   */
  function getVerticalScrollPosition(lastVerticalScrollPosition) {
    /* There is a bug where if the vertical scroll position is at 0 or scrollMaxY, then
    the returned value is mostly scrollMaxY. To prevent this, we just need to set either
    1 or window.scrollMaxY - 1. */
    if (lastVerticalScrollPosition <= 0) {
      return 1;
    } else if (lastVerticalScrollPosition >= window.scrollMaxY) {
      return window.scrollMaxY - 1;
    } else {
      return lastVerticalScrollPosition;
    }
  }

  /**
   * Return the title string from a given page value.
   *
   * @param String page
   *
   * @return String
   */
  function getTitle(location) {
    const title = toPascalCase(getHash(location).replace('_', ' '));

    return `${title} - Huy Nguyen`;
  }

  /**
   * Convert the given string to Pascal case.
   * Returns empty string on error.
   * Source: https://stackoverflow.com/questions/4068573/convert-string-to-pascal-case-aka-uppercamelcase-in-javascript
   *
   * @param String value
   *
   * @return String
   */
  function toPascalCase(value) {
    return value.replace(/\w+/g, function (word) {
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    });
  }

  /**
   * Set the theme based on the theme defined in the document.location.
   */
  function setTheme() {
    const elements = document.querySelectorAll(
      'html, body, nav, footer, .card, .box, h1, p, button, a, #navbar'
    );
    const theme = getTheme(document.location);

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      if (theme === 'light') {
        element.classList.remove(
          'has-background-dark',
          'card-shadow-white',
          'has-text-white'
        );
      } else {
        if (element.classList.contains('card') || element.classList.contains('box')) {
          element.classList.add('card-shadow-white');
        }

        element.classList.add('has-background-dark', 'has-text-white');
      }
    }
  }

  /**
   * Change the theme button text to current theme.
   */
  function setThemeButtonText() {
    let themeText = 'Dark';

    if (getTheme(document.location) === 'dark') {
      themeText = 'Light';
    }

    document.getElementById('theme').innerText = `${themeText} Mode`;
  }

  /**
     * Get the hash from the given url.
     *
     * @param String url
     *
     * @return String
     */
  function getHash(location) {
    const url = new URL(location);

    // Remove the hash at the beginning.
    return url.hash.substring(1);
  }

  /**
   * Get the theme from the given url.
   *
   * @param String url
   *
   * @return String
   */
  function getTheme(location) {
    const url = new URL(location);

    return url.searchParams.get('theme');
  }
})();
