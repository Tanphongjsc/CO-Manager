from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="index"),
    path('orders/', views.orders, name='orders'),
    path("purchase/", views.purchase, name="purchase"),
    path("wo/", views.wo_ledger, name="wo_ledger"),
    path("ctc/", views.ctc_ledger, name="ctc_ledger"),
    path('user/', views.user_management, name='users'),
    path('rollback/', views.rollback, name='rollback'),
    path('rollback/create/', views.rollback_create, name='rollback_create'),
    path('rollback/<int:pk>/', views.rollback_detail, name='rollback_detail'),
    path('rollback/<int:pk>/export/pdf/', views.rollback_export_pdf, name='rollback_export_pdf'),
    path('rollback/<int:pk>/export/excel/', views.rollback_export_excel, name='rollback_export_excel'),
    path('api/get_lenh_san_xuat/', views.get_lenh_san_xuat, name='get_lenh_san_xuat'),
    path('api/get_lenh_san_xuat_detail/', views.get_lenh_san_xuat_detail, name='get_lenh_san_xuat_detail'),
]