import ast
import builtins
import os

directories = [
    r'd:\openvaartha-api\openvaartha-api\app\services',
    r'd:\openvaartha-api\openvaartha-api\app\api\v1',
]

def check_undefined_names(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        source = f.read()

    try:
        tree = ast.parse(source)
    except Exception as e:
        print(f"{filepath} syntax error: {e}")
        return

    defined_names = set(dir(builtins))
    # We should track imports
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for name in node.names:
                defined_names.add(name.asname or name.name.split('.')[0])
        elif isinstance(node, ast.ImportFrom):
            for name in node.names:
                defined_names.add(name.asname or name.name)
        elif isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef) or isinstance(node, ast.ClassDef):
            defined_names.add(node.name)
        elif isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name):
                    defined_names.add(target.id)

    undefined = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Load) and node.id not in defined_names:
                undefined.add(node.id)

    # Some false positives for locals, arguments, etc but good enough for models
    models_to_check = ['User', 'Article', 'ReadingList', 'ReadingHistory', 'PasswordResetToken', 'Author', 'Category', 'Comment', 'Dispatch', 'Feed', 'Poll', 'Series', 'Reaction', 'DailyDigest', 'Page', 'NewsletterSubscriber']
    missing_models = [m for m in models_to_check if m in undefined]
    
    if missing_models:
        print(f"{filepath} missing: {missing_models}")

for d in directories:
    if not os.path.exists(d): continue
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.py'):
                check_undefined_names(os.path.join(root, file))
