from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Create default admin user'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(email='admin@predictive.ai').exists():
            User.objects.create_superuser(
                email='admin@predictive.ai',
                username='admin',
                password='admin123',
                role='admin',
                department='Engineering'
            )
            self.stdout.write(self.style.SUCCESS('Admin user created: admin@predictive.ai / admin123'))
        else:
            self.stdout.write('Admin user already exists.')

        if not User.objects.filter(email='engineer@predictive.ai').exists():
            User.objects.create_user(
                email='engineer@predictive.ai',
                username='engineer',
                password='engineer123',
                role='engineer',
                department='Operations'
            )
            self.stdout.write(self.style.SUCCESS('Engineer user created.'))
