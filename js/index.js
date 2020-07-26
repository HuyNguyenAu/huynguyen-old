window.addEventListener('load', onLoadEvent);
window.addEventListener('hashchange', onHashChangeEvent);

function onHashChangeEvent(event) {
    onLoadEvent();
}

function onLoadEvent() {
    // Clear out any existing content.
    document.getElementById('content').innerHTML = '';
    console.log(document.location.hash);

    switch (document.location.hash) {
        case '':
            document.location.hash = '#home';
            break;
        case '#home':
            showHome();
            break;
        default:
            showArticle('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/' + document.location.hash.replace('#', '') + '.html');
            break;
    }
}

function getArticles() {
    return get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json');
}

function showError(error) {
    document.location.hash = '#error';
    showArticle('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/html/error.html');
    let articleBody = temp.querySelectorAll('.article-body');
    let errorMessage = document.createElement('p');
    errorMessage.appendChild(document.createTextNode(error));
    articleBody.appendChild(errorMessage);
}

function showHome() {
    get('https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/json/articles.json', function (json) {
        JSON.parse(json).articles.forEach(url => {
            get(url, function (article, url) {
                document.getElementById('content').innerHTML += createArticle(article, url);
            });
        });
    });
}

function showArticle(url) {
    get(url, function (html, _) {
        document.getElementById('content').innerHTML = html;
    })
}

async function get(url, callback) {
    return fetch(url)
        .then((response) => {
            if (response.ok) {
                return response.text();
            } else {
                showError();
                throw new Error('Failed to load ' + url);
            }
        })
        .then((content) => callback(content, url))
        .catch((error) => {
            console.log(error);
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
