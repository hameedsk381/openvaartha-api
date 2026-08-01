import os

services_dir = 'd:/openvaartha-api/openvaartha-api/app/services'
for root, dirs, files in os.walk(services_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if '\\"' in content:
                content = content.replace('\\"', '"')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
