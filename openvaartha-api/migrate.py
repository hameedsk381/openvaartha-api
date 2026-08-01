import os
import re

directories = [
    r'd:\openvaartha-api\openvaartha-api\app\services',
    r'd:\openvaartha-api\openvaartha-api\app\api\v1',
    r'd:\openvaartha-api\openvaartha-api\app\models',
]

model_map = {
    'users': 'User',
    'reading_lists': 'ReadingList',
    'reading_history': 'ReadingHistory',
    'articles': 'Article',
    'password_reset_tokens': 'PasswordResetToken',
    'authors': 'Author',
    'categories': 'Category',
    'comments': 'Comment',
    'dispatches': 'Dispatch',
    'feeds': 'Feed',
    'polls': 'Poll',
    'series': 'Series',
    'reactions': 'Reaction',
    'digests': 'Digest',
    'pages': 'Page',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig_content = content
    
    # Imports
    # We should add imports for the models we use
    models_used = set()
    
    # 1. db["collection"].find_one(...)
    def find_one_repl(m):
        col, args = m.group(1), m.group(2)
        model = model_map.get(col, col.capitalize())
        models_used.add(model)
        return f'{model}.find_one({args})'
    content = re.sub(r'db\[["\'](\w+)["\']\]\.find_one\((.*?)\)', find_one_repl, content, flags=re.DOTALL)
    
    # 2. db["collection"].find(...)
    def find_repl(m):
        col, args = m.group(1), m.group(2)
        model = model_map.get(col, col.capitalize())
        models_used.add(model)
        return f'{model}.find({args})'
    content = re.sub(r'db\[["\'](\w+)["\']\]\.find\((.*?)\)', find_repl, content, flags=re.DOTALL)

    # 3. db["collection"].insert_one(...) -> Model(**...).insert()
    def insert_one_repl(m):
        col, args = m.group(1), m.group(2)
        model = model_map.get(col, col.capitalize())
        models_used.add(model)
        return f'{model}(**{args}).insert()'
    content = re.sub(r'db\[["\'](\w+)["\']\]\.insert_one\((.*?)\)', insert_one_repl, content, flags=re.DOTALL)

    # 4. db["collection"].update_one(query, update, ...)
    def update_one_repl(m):
        col, query, rest = m.group(1), m.group(2), m.group(3)
        model = model_map.get(col, col.capitalize())
        models_used.add(model)
        # simplistic: just chain
        return f'{model}.find_one({query}).update({rest})'
    # update_one( {query}, {update} )
    # This regex is a bit simplistic, we'll see
    # content = re.sub(r'db\[["\'](\w+)["\']\]\.update_one\((.*?),\s*(.*?)\)', update_one_repl, content, flags=re.DOTALL)
    
    # just do find-and-replace for the exact db[...]
    def db_repl(m):
        col = m.group(1)
        model = model_map.get(col, col.capitalize())
        models_used.add(model)
        return f'{model}'
    content = re.sub(r'db\[["\'](\w+)["\']\]', db_repl, content)

    if content != orig_content:
        # Add imports if necessary
        # We'll just print for now
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")

for d in directories:
    if not os.path.exists(d): continue
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.py'):
                process_file(os.path.join(root, file))

print("Done")
