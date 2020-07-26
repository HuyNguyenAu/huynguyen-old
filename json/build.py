from os import listdir
from sys import argv
from bs4 import BeautifulSoup

if len(argv) != 2:
    exit()

working_dir = argv[1]
ignore = open(working_dir + "\\json\\ignore.txt").read().splitlines()
articles = ""

content = BeautifulSoup(open(working_dir + "\\html\\base_index.html").read(), features="html.parser")

for file in listdir(working_dir + "\\html"):
    if file not in ignore:
        print(file)
        article = BeautifulSoup(open(working_dir + "\\html\\" + file).read(), features="html.parser")

        new_b = article.new_tag('a')
        new_b["href"] = "html\\" + file
        article.find("h2", {"class": "article-title"}).wrap(new_b)

        articleBodyParagraphs = article.find("div", {"class": "article-body"}).findAll("p")
        
        for i in range(1, len(articleBodyParagraphs)):
            articleBodyParagraphs[i].decompose()

        content.find("div", {"id": "content"}).append(article.find("div", {"class": "article"}))

f = open(working_dir + "\\index.html", "w")
f.write(content.prettify())
f.close()
