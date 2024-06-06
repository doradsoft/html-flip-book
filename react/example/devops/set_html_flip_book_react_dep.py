import json
import sys

def update_package_json(env):
    # TODO build path based on $REACT_EXAMPLE_ROOT
    package_json_path = './package.json'

    with open(package_json_path, 'r') as file:
        package_json = json.load(file)

    if env == 'DEV':
        package_json['dependencies']['html-flip-book-react'] = 'file:..'
    elif env == 'PROD':
        package_json['dependencies']['html-flip-book-react'] = package_json['version']
    else:
        print('Invalid environment. Use DEV or PROD.')
        return

    with open(package_json_path, 'w') as file:
        json.dump(package_json, file, indent=2)

    print(f"html-flip-book-react dependency set to {package_json['dependencies']['html-flip-book-react']}")

if len(sys.argv) != 2:
    print("Usage: python set_html_flip_book_react_dep.py <DEV|PROD>")
else:
    update_package_json(sys.argv[1])
