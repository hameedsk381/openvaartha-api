import os
import re

services_dir = 'd:/openvaartha-api/openvaartha-api/app/services'

models = [
    'Article', 'Author', 'Category', 'Comment', 'DailyDigest', 'Dispatch', 
    'NewsletterSubscriber', 'PasswordResetToken', 'Poll', 'PollVote', 'Reaction', 
    'ReadingHistory', 'ReadingList', 'Series', 'Source', 'User'
]

methods = [
    'aggregate', 'count_documents', 'delete_many', 'delete_one', 'find', 
    'find_one', 'find_one_and_update', 'insert_many', 'insert_one', 
    'update_many', 'update_one'
]

def fix_fake_models(content, fake_name, real_collection):
    for method in methods:
        content = re.sub(fr'{fake_name}\.{method}\(', f'db["{real_collection}"].{method}(', content)
    return content

def fix_real_models(content, model_name):
    for method in methods:
        # Avoid replacing if it already has .get_motor_collection()
        content = re.sub(fr'(?<!get_motor_collection\(\)){model_name}\.{method}\(', f'{model_name}.get_motor_collection().{method}(', content)
    return content

for root, dirs, files in os.walk(services_dir):
    for file in files:
        if file.endswith('.py'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Fix hallucinated models
            content = fix_fake_models(content, 'Sources', 'sources')
            content = fix_fake_models(content, 'Article_sources', 'article_sources')
            content = fix_fake_models(content, 'Newsletter_subscribers', 'newsletter_subscribers')
            
            # Fix real models
            for m in models:
                content = fix_real_models(content, m)
                
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
