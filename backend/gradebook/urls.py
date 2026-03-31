from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GradeCategoryViewSet, GradeEntryViewSet

router = DefaultRouter()
router.register(r'grade-categories', GradeCategoryViewSet, basename='grade-category')
router.register(r'grades', GradeEntryViewSet, basename='grade')

urlpatterns = [path('', include(router.urls))]
