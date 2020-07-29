from os import listdir, path
from sys import argv
from bs4 import BeautifulSoup
from datetime import datetime
from json import dumps
from calendar import month_name

class Article:
    def __init__(self, title, date, category, url, html):
        self.title = title
        self.date = date
        self.category = category
        self.url = url
        self.html = html


def getLocalPath(item):
    local_path = item

    if "." in item:
        local_path = "{}\\{}".format(item.split(".").pop(), item)

    return local_path


def getAbsolutePath(working_dir, item):
    return "{}\\{}".format(working_dir, getLocalPath(item))


def searchPath(working_dir, items):
    for item in items:
        absolute_path = getAbsolutePath(working_dir, item)

        if not path.exists(absolute_path):
            print("Unable to find {}".format(absolute_path))
            exit()


def createHTMLFromDir(working_dir, item):
    return BeautifulSoup(
        open(getAbsolutePath(working_dir, item)).read(), features="html.parser"
    )

def parseArticles(working_dir):
    articles = []
    ignore = open(getAbsolutePath(working_dir, "ignore.txt")).read().splitlines()

    for item in listdir(getAbsolutePath(working_dir, "html")):
        if item not in ignore:
            article = createHTMLFromDir(working_dir, item)
            articles.append(
                Article(
                    article.find("h2", {"class": "article-title"}).string,
                    article.find("span", {"class": "article-date"}).string,
                    article.find("span", {"class": "article-category"}).string,
                    "https://raw.githubusercontent.com/HuyNguyenAu/huynguyen/master/{}".format(getLocalPath(item).replace("\\", "/")),
                    article,
                )
            )

    return sorted(articles, key=lambda x: datetime.strptime(x.date, "%d/%m/%Y"), reverse=True)

def buildContent(items):
    articles = []

    for article in items:
        newLink = article.html.new_tag('a')
        newLink["href"] = article.url
        article.html.find("h2", {"class": "article-title"}).wrap(newLink)
        
        paragraphs = article.html.find("div", {"class": "article-body"}).findAll("p")
        for i in range(0, len(paragraphs)):
            if i == 0:
                paragraphs[i]["class"] = "truncate"
            else:
                paragraphs[i].decompose()

        articles.append(article)

    return articles

def buildIndex(working_dir, base, items, limit):
    index = createHTMLFromDir(working_dir, base)

    for i in range(len(items)):
        if i < limit:
            index.find("div", {"id": "content"}).append(items[i].html.find("div", {"class": "article"}))
        else:
            break

    return index

def buildArchives(articles):
    content = []
    lastMonthYear = ""

    for article in articles:
        date = article.date.split("/")
        monthYear = "{} {}".format(month_name[int(date[1])], date.pop())

        # This assumes the list of articles are sorted. 
        if lastMonthYear != monthYear:
            lastMonthYear = monthYear
            archiveDate = article.html.new_tag('h2')
            archiveDate["class"] = "archive-date"
            archiveDate.append(monthYear)
            content.append(archiveDate.prettify())

        content.append(article.html.prettify())
    
    return content

def obj_dict(obj):
    return obj.__dict__

def buildJSON(articles):
    for article in articles:
        del article.html

    return dumps(articles, default=obj_dict)

def writeFile(working_dir, fileName, contents):
    writer = open("{}\\{}".format(working_dir, fileName), "w")
    writer.write(contents)
    writer.close()

def main():
    if len(argv) != 2:
        exit()

    working_dir = argv[1]
    required_dirs = ["html", "css", "img"]
    required_files = ["base.html", "index.css", "ignore.txt"]

    # Search for required directories.
    searchPath(working_dir, required_dirs)
    # Search for required files.
    searchPath(working_dir, required_files)
    # Parse articles and build a list of articles with required meta data.
    articles = parseArticles(working_dir)
    # Create the archive.html.
    writeFile(working_dir, getLocalPath("archives.html"), "".join(buildArchives(articles)))
    # Create the articles.json.
    writeFile(working_dir, getLocalPath("articles.json"), buildJSON(articles))
    # items = buildContent(articles)
    # index = buildIndex(working_dir, "base.html", items, 10).prettify()

if __name__ == "__main__":
    main()
