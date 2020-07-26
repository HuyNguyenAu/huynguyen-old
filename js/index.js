window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);

function onHashChangeEvent(event) {
    onLoadEvent();
}

function onLoadEvent() {
    // Clear out any existing content.
    document.getElementById('content').innerHTML = '';

    switch (document.location.hash) {
        case '':
            document.location.hash = '#home';
            break;
        case '#home':
            showHome();
            break;
        default:
            showContent('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + document.location.hash.replace('#', '') + '.html');
            break;
    }
}

function showError(error) {
    showContent('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/error.html', function () {
        document.querySelector('.article-body').innerHTML += "<p>" + error + "<p>";
    });
}

function showHome() {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json', function (json) {
        JSON.parse(json).articles.forEach(article => {
            get(article.url, function (html, url) {
                document.getElementById('content').innerHTML += createArticle(html, url);
            });
        });
    });
}

function showContent(url, callback) {
    get(
        url,
        function (html, _) {
            document.getElementById('content').innerHTML = html;

            if (typeof (callback) === 'function') {
                callback();
            }
        }
    );
}

async function get(url, callback) {
    return fetch(url)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error(response.status + '. Failed to load ' + url);
            }
        })
        .then((content) => {
            if (typeof (callback) === 'function') {
                callback(content, url);
            }
        })
        .catch((e) => {
            showError(e);
            console.warn(e);
        });
}

function createArticle(html, url) {
    let temp = document.createElement('temp');
    temp.innerHTML = html;

    let title = temp.querySelector('.article-title');
    /* Add link to .article-title so when the user clicks on the title,
   we can get that link to load the article into the content. */
    title.setAttribute('link', url);
    /* Wrap the header in a link so it give the user visual feedback of a link. */
    title.outerHTML = '<a href="#' + url.split('/').pop().replace('.html', '') + '">' + title.outerHTML + "</a>";

    let paragraphs = temp.querySelectorAll('.article-body p');

    /* Transform the article into an item. */
    for (let i = 0; i < paragraphs.length; i++) {
        if (i === 0) {
            paragraphs[i].classList.add('truncate');
        } else {
            paragraphs[i].remove();
        }
    }

    return temp.innerHTML;
}
