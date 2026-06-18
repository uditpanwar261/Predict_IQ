from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from datetime import date

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        User = get_user_model()
        if not User.objects.filter(email='admin@predictive.ai').exists():
            User.objects.create_superuser(
                email='admin@predictive.ai',
                username='admin',
                password='admin123',
                role='admin'
            )
            self.stdout.write('Admin user created')