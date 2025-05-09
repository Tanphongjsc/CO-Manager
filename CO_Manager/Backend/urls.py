from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="index"),
    path('orders/', views.orders, name='orders'),
    path('rollback/', views.rollback, name='rollback'),
    path("purchase/", views.purchase, name="purchase"),
    path("wo/", views.wo_ledger, name="wo_ledger"),
    path("ctc/", views.ctc_ledger, name="ctc_ledger"),
    path('user/', views.user_management, name='users'),
]