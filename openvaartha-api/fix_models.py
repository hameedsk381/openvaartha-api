import os
import re

services_dir = 'd:/openvaartha-api/openvaartha-api/app/services'

def fix_fake_models(content, model_name, collection_name):
    # .create_index(...)
    content = re.sub(fr'{model_name}\.create_index\(', f'db[\"{collection_name}\"].create_index(', content)
    # .drop_index(...)
    content = re.sub(fr'{model_name}\.drop_index\(', f'db[\"{collection_name}\"].drop_index(', content)
    # .find(...)
    content = re.sub(fr'{model_name}\.find\(', f'db[\"{collection_name}\"].find(', content)
    # .find_one(...)
    content = re.sub(fr'{model_name}\.find_one\(', f'db[\"{collection_name}\"].find_one(', content)
    # .update_one(...)
    content = re.sub(fr'{model_name}\.update_one\(', f'db[\"{collection_name}\"].update_one(', content)
    # .delete_one(...)
    content = re.sub(fr'{model_name}\.delete_one\(', f'db[\"{collection_name}\"].delete_one(', content)
    # .delete_many(...)
    content = re.sub(fr'{model_name}\.delete_many\(', f'db[\"{collection_name}\"].delete_many(', content)
    # .aggregate(...)
    content = re.sub(fr'{model_name}\.aggregate\(', f'db[\"{collection_name}\"].aggregate(', content)
    # (**doc).insert()
    content = re.sub(fr'{model_name}\(\*\*(.*?)\)\.insert\(\)', fr'db[\"{collection_name}\"].insert_one(\1)', content)
    return content

valid_models = ['Article', 'Category', 'Comment', 'Dispatch', 'ReadingHistory']

for root, dirs, files in os.walk(services_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            content = fix_fake_models(content, 'Article_content', 'article_content')
            content = fix_fake_models(content, 'Poll_votes', 'poll_votes')
            content = fix_fake_models(content, 'Push_subscriptions', 'push_subscriptions')
            content = fix_fake_models(content, 'Article_reactions', 'article_reactions')
            
            for m in valid_models:
                content = re.sub(fr'{m}\.create_index\(', f'{m}.get_motor_collection().create_index(', content)
                content = re.sub(fr'{m}\.drop_index\(', f'{m}.get_motor_collection().drop_index(', content)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
