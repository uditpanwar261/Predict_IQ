from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLES = [('admin', 'Admin'), ('engineer', 'Engineer'), ('viewer', 'Viewer')]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLES, default='engineer')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
