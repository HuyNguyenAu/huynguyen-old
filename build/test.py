import json
import bs4
import os

parsed_blocks = []
parse_stack = []

# Block
block_ids = []
block_tags = []
block_contents = []

# Run every single object recursively. This essentially runs from outer in inner, top to bottom.
def parse_post(json_object):
    # Run through each item in this dictionary, if an item is a dictionary or list, run it through this function.
    if type(json_object) is dict:
        for key in json_object:
            value = json_object[key]
            if is_json_object_dict_or_list(value):
                # Keep track of the recursion.
                parse_stack.append(str(key))
                parse_post(value)
                parse_stack.pop()

                # Since links can never be a root item in content, we don't want consider this as a block.
                if str(key) not in ["a"]:
                    parsed_blocks.append(str(key))

    # Run through each item in this list, if an item is a dictionary or list, run it through this function.
    elif type(json_object) is list:
        for item in json_object:
            if is_json_object_dict_or_list(item):
                parse_post(item)

            # We're at the point were there are not more lists or dictionaries.
            # We can now start to build the content so that we can later use this
            # to build the HTML.
            else:
                tags = []

                # Not sure why block_tags.append(parse_stack) doesn't work.
                for tag in parse_stack:
                    tags.append(tag)

                block_ids.append(len(parsed_blocks))
                block_tags.append(tags)
                block_contents.append(item)


# Return the true if object is a dictionary or list.
def is_json_object_dict_or_list(json_object: object) -> bool:
    if type(json_object) is dict or type(json_object) is list:
        return True
    return False


# Return JSON object from the given path.
def read_file(path: str) -> object:
    with open(path, "r") as file:
        return json.loads(file.read())


# Return the next item in a list. If there is none, return None.
def next(array: list, index: int) -> object:
    if index < len(array) - 1:
        return array[index + 1]
    return None


# Return the previous item in a list. If there is none, return None.
def previous(array: list, index: int) -> object:
    if index > 0:
        return array[index - 1]
    return None


def create_html() -> str:
    html = ""

    link_stack = []

    for i in range(len(block_tags)):
        # Root ids.
        prev_root_id = previous(block_ids, i)
        root_id = block_ids[i]
        next_root_id = next(block_ids, i)

        # Tags.
        previous_tags = previous(block_tags, i)
        tags = block_tags[i]
        next_tags = next(block_tags, i)

        content = block_contents[i]
        root_tag = tags[0]

        # Handle paragraphs and paragraphs with links.
        if root_tag == "p":
            # print(tags, prev_root_id, root_id, next_root_id, content)
            # Handle the start of a paragraph.
            if prev_root_id != root_id and next_root_id == root_id:
                if tags[-1] == "a":
                    html += f'<p><a href="{content}">'
                    print("start", content, tags)
                else:
                    html += f"<p>{content}"

            # Handle the middle of the paragraph.
            elif prev_root_id == root_id and next_root_id == root_id:
                if tags[-1] == "a":
                    link_stack.append("a")

                # print(content, tags, link_stack)

                if len(link_stack) >= 2:
                    link_stack = []
                # # Handle the href of a link.
                # if (
                #     tags[-1] == "a"
                #     and previous_tags[-1] != "a"
                #     and next_tags[-1] == "a"
                # ):
                #     html += f'<a href="{content}">'

                # # Handle the text of a link.
                # elif (
                #     tags[-1] == "a"
                #     and previous_tags[-1] == "a"
                #     and next_tags[-1] != "a"
                # ):
                #     html += f"{content}</a>"

                # # Handle the text of the paragraph.
                # else:
                #     html += f"{content}"

            # Handle the end of a paragraph.
            elif prev_root_id == root_id and next_root_id != root_id:
                if tags[-1] == "a":
                    html += f"{content}</a></p>"
                    print("end", content, tags)
                else:
                    html += f"{content}</p>"

            # Handle a paragraph with no links.
            else:
                html += f"<p>{content}</p>"

        # Handle code blocks or single line of code.
        elif root_tag == "code":
            # Handle the start of code with multiple lines.
            if prev_root_id != root_id and next_root_id == root_id:
                html += f'<div class="is-inline-block has-text-weight-light has-background-light p-5 mb-6"><p>{content}</p>'

            # Handle the middle of code with multiple lines.
            elif prev_root_id == root_id and next_root_id == root_id:
                html += f"<p>{content}</p>"

            # Handle the end of code with multiple lines.
            elif prev_root_id == root_id and next_root_id != root_id:
                html += f"<p>{content}</p></div>"

            # Handle the a single line of code.
            else:
                html += f'<div class="is-inline-block has-text-weight-light has-background-light p-5 mb-6"><p>{content}</p></div>'

    return html


def load_html(path: str) -> bs4.BeautifulSoup:
    return bs4.BeautifulSoup(open(path).read(), features="html.parser")


def create_post_html(bases: bs4.BeautifulSoup, post: object):
    global parsed_blocks
    global parse_stack
    global block_ids
    global block_tags
    global block_contents

    parsed_blocks = []
    parse_stack = []
    block_ids = []
    block_tags = []
    block_contents = []

    base = bases
    for item in post:
        item_content = post[item]

        if len(item_content) <= 0:
            continue

        if item == "image":
            base.find("figure", class_="image").append(
                bs4.BeautifulSoup(f'<img src="img/{item_content}">', "html.parser")
            )
        elif item == "title":
            base.find("p", class_="title is-4").append(
                bs4.BeautifulSoup(item_content, "html.parser")
            )
        elif item == "date":
            base.find("p", class_="subtitle is-6").append(
                bs4.BeautifulSoup(item_content, "html.parser")
            )
        elif item == "content":
            parse_post(item_content)
            base.find("div", class_="content").append(
                bs4.BeautifulSoup(create_html(), "html.parser")
            )

    return str(base)


post_path = "posts"
for filename in os.listdir(post_path):
    # if (
    #     filename.endswith(".json")
    #     and filename == "setting_up_matterport_mask_rcnn.json"
    # ):
    print(filename)
    if filename.endswith(".json"):
        base = load_html("base/base.html")
        path = os.path.join(post_path, filename)
        post = read_file(path)

        with open(filename.replace(".json", ".html"), "w") as file:
            file.write(create_post_html(base, post))
