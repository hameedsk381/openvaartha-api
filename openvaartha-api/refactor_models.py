import os
import re
import glob

collections = {
    'Article': 'articles',
    'Source': 'sources',
    'Author': 'authors',
    'Category': 'categories',
    'Comment': 'comments',
    'Digest': 'digests',
    'NewsletterSubscriber': 'newsletter_subscribers',
    'NewsletterIssue': 'newsletter_issues',
    'Poll': 'polls',
    'PollVote': 'poll_votes',
    'Reaction': 'reactions',
    'ReadingList': 'reading_lists',
    'ReadingHistory': 'reading_history',
    'Series': 'series',
    'User': 'users'
}

def migrate_models():
    files = glob.glob('app/models/*.py')
    for f in files:
        if '__init__' in f: continue
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
            
        original_content = content
        
        if 'beanie' not in content:
            if 'from pydantic import BaseModel' in content:
                content = content.replace('from pydantic import BaseModel', 'from pydantic import BaseModel\nfrom beanie import Document')
            else:
                content = 'from beanie import Document\n' + content
                
        for class_name, coll_name in collections.items():
            pattern = r'class ' + class_name + r'\s*\(\s*BaseModel\s*\):'
            if re.search(pattern, content):
                content = re.sub(pattern, f'class {class_name}(Document):', content)
                content = re.sub(r'\s*@model_validator\(mode="before"\)\s*@classmethod\s*def map_mongo_id.*?return data\n', '\n', content, flags=re.DOTALL)
                
                class_pattern = rf'(class {class_name}\(Document\):.*?)(?=\n\nclass|\Z)'
                
                def add_settings(match):
                    cls_body = match.group(1)
                    if 'class Settings:' not in cls_body:
                        cls_body += f'\n\n    class Settings:\n        name = "{coll_name}"\n'
                    return cls_body
                
                content = re.sub(class_pattern, add_settings, content, flags=re.DOTALL)
                
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)

if __name__ == '__main__':
    migrate_models()
    print("Models migrated")
