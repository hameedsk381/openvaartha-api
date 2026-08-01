import os

missing_imports = {
    r'd:\openvaartha-api\openvaartha-api\app\services\article_service.py': ['Article', 'ReadingHistory', 'Category'],
    r'd:\openvaartha-api\openvaartha-api\app\services\category_service.py': ['Article', 'Category'],
    r'd:\openvaartha-api\openvaartha-api\app\services\comment_service.py': ['Comment'],
    r'd:\openvaartha-api\openvaartha-api\app\services\digest_service.py': ['NewsletterSubscriber'],
    r'd:\openvaartha-api\openvaartha-api\app\services\dispatch_service.py': ['Article', 'Category', 'Dispatch'],
    r'd:\openvaartha-api\openvaartha-api\app\services\feed_service.py': ['Article', 'Category'],
    r'd:\openvaartha-api\openvaartha-api\app\services\reaction_service.py': ['Article'],
    r'd:\openvaartha-api\openvaartha-api\app\services\rss_service.py': ['Article'],
    r'd:\openvaartha-api\openvaartha-api\app\services\seed_service.py': ['User'],
    r'd:\openvaartha-api\openvaartha-api\app\services\series_service.py': ['Article', 'Series'],
    r'd:\openvaartha-api\openvaartha-api\app\services\user_service.py': ['User', 'Article', 'ReadingList', 'ReadingHistory', 'PasswordResetToken'],
    r'd:\openvaartha-api\openvaartha-api\app\api\v1\admin.py': ['User', 'Article', 'Category', 'Comment'],
    r'd:\openvaartha-api\openvaartha-api\app\api\v1\authors.py': ['Author'],
    r'd:\openvaartha-api\openvaartha-api\app\api\v1\feeds.py': ['Category'],
    r'd:\openvaartha-api\openvaartha-api\app\api\v1\search.py': ['Category']
}

model_to_module = {
    'Article': 'app.models.article',
    'User': 'app.models.user',
    'ReadingList': 'app.models.user', # assuming
    'ReadingHistory': 'app.models.user', # assuming
    'PasswordResetToken': 'app.models.user',
    'Category': 'app.models.category',
    'Comment': 'app.models.comment',
    'Author': 'app.models.author',
    'Dispatch': 'app.models.dispatch',
    'Series': 'app.models.series',
    'NewsletterSubscriber': 'app.models.newsletter',
}

for filepath, models in missing_imports.items():
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    imports = []
    for m in models:
        mod = model_to_module.get(m, f'app.models.{m.lower()}')
        imports.append(f'from {mod} import {m}')
    
    import_str = '\n'.join(imports) + '\n'
    
    content = import_str + content
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Added imports to {filepath}")
