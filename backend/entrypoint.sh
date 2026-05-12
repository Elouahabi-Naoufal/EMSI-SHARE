#!/bin/sh
python manage.py migrate

python manage.py shell -c "
from users.models import User
if not User.objects.filter(email='$SUPERUSER_EMAIL').exists():
    User.objects.create_superuser(
        username='$SUPERUSER_USERNAME',
        email='$SUPERUSER_EMAIL',
        password='$SUPERUSER_PASSWORD',
        role='admin'
    )
    print('Superuser created.')
else:
    print('Superuser already exists.')
"

daphne -b 0.0.0.0 -p 8000 backend_project.asgi:application
