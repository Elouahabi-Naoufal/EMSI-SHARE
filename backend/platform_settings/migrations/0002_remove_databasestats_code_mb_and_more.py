# Generated by Django 5.2.1 on 2025-06-20 11:21

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('platform_settings', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='databasestats',
            name='code_mb',
        ),
        migrations.RemoveField(
            model_name='databasestats',
            name='documents_mb',
        ),
        migrations.RemoveField(
            model_name='databasestats',
            name='images_mb',
        ),
        migrations.RemoveField(
            model_name='databasestats',
            name='total_space_gb',
        ),
        migrations.RemoveField(
            model_name='databasestats',
            name='used_space_gb',
        ),
        migrations.RemoveField(
            model_name='databasestats',
            name='videos_mb',
        ),
    ]
