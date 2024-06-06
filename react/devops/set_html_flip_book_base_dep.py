import json
import sys

def update_package_json(env):
    # TODO build path based on $REACT_PROJECT_ROOT
    package_json_path = './package.json'

    with open(package_json_path, 'r') as file:
        package_json = json.load(file)

    if env == 'DEV':
        package_json['dependencies']['html-flip-book-base'] = 'file:../base'
    elif env == 'PROD':
        package_json['dependencies']['html-flip-book-base'] = package_json['version']
    else:
        print('Invalid environment. Use DEV or PROD.')
        return

    with open(package_json_path, 'w') as file:
        json.dump(package_json, file, indent=2)

    print(f"html-flip-book-base dependency set to {package_json['dependencies']['html-flip-book-base']}")

if len(sys.argv) != 2:
    print("Usage: python set_html_flip_book_base_dep.py <DEV|PROD>")
else:
    update_package_json(sys.argv[1])
