import json
import sys

def update_package_json(env):
    package_json_path = './package.json'

    with open(package_json_path, 'r') as file:
        package_json = json.load(file)

    if env == 'DEV':
        package_json['devDependencies']['flip-book'] = 'file:../base'
    elif env == 'PROD':
        package_json['devDependencies']['flip-book'] = package_json['version']
    else:
        print('Invalid environment. Use DEV or PROD.')
        return

    with open(package_json_path, 'w') as file:
        json.dump(package_json, file, indent=2)

    print(f"flip-book dependency set to {package_json['devDependencies']['flip-book']}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python set_html_flip_book_base_dep.py <DEV|PROD>")
    else:
        update_package_json(sys.argv[1])
