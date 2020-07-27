from os import listdir, path
from sys import argv
from bs4 import BeautifulSoup

if len(argv) != 2:
    exit()

working_dir = argv[1]
required_dirs = ["html", "css", "img"]
required_files = ["base.html", "index.css", "ignore.txt"]

class Article:
    def __init__(self, title, author, date, category, url, html):
        self.title = title
        self.author = author
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

        if path.exists(absolute_path):
            print("Found {}".format(absolute_path))
        else:
            print("Unable to find {}".format(absolute_path))
            exit()      

def createHTML(item):
    return BeautifulSoup(open(getAbsolutePath(working_dir, item)).read(), features="html.parser")

def parseArticles(working_dir):
    articles = []
    ignore = open(getAbsolutePath(working_dir, "ignore.txt")).read().splitlines()

    for item in listdir(getAbsolutePath(working_dir, "html")):
        if item not in ignore:
            article = createHTML(item)
            title = article.find("h2", {"class": "article-title"})
            author = article.find("a", {"class": "article-author"})
            date = article.find("span", {"class": "article-date"})
            category = article.find("a", {"class": "article-category"})
            url = article.find("div", {"class": "article"})
            content = article.find("div", {"class": "article"})

            articles.append(title, author, date, category, url, content)

            print(date)

# Search for required directories.
searchPath(working_dir, required_dirs)
# Search for required files.
searchPath(working_dir, required_files)

# parseArticles(working_dir)

# articles = ""

# for file in listdir(working_dir + "\\html"):
#     if file not in ignore:
#         print(file)

# for file in listdir(working_dir + "\\html"):
#     if file not in ignore:
#         print(file)
#         article = BeautifulSoup(open(working_dir + "\\html\\" + file).read(), features="html.parser")

#         newLink = article.new_tag('a')
#         newLink["href"] = "html\\" + file
#         article.find("h2", {"class": "article-title"}).wrap(newLink)

#         articleBodyParagraphs = article.find("div", {"class": "article-body"}).findAll("p")

#         for i in range(1, len(articleBodyParagraphs)):
#             articleBodyParagraphs[i].decompose()

#         content.find("div", {"id": "content"}).append(article.find("div", {"class": "article"}))

# f = open(working_dir + "\\index.html", "w")
# f.write(content.prettify())
# f.close()
