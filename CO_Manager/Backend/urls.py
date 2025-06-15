from django.urls import path
from . import views

urlpatterns = [
    path("", views.dashboard, name="index"),
    path('orders/', views.orders, name='orders'),
    path("ctc/", views.ctc_ledger, name="ctc_ledger"),
    path('user/', views.user_management, name='users'),

    # Rollback URLs
    path('rollback/', views.rollback, name='rollback'),
    path('rollback/create/', views.rollback_create, name='rollback_create'),
    path('rollback/<int:pk>/', views.rollback_detail, name='rollback_detail'),
    path('api/rollback/update/<int:pk>/', views.rollback_update, name='rollback_update_api'),
    path('rollback/<int:pk>/export/pdf/', views.rollback_export_pdf, name='rollback_export_pdf'),
    path('rollback/<int:pk>/export/excel/', views.rollback_export_excel, name='rollback_export_excel'),
    
    # API URLs
    path('api/get_lenh_san_xuat/', views.get_lenh_san_xuat, name='get_lenh_san_xuat'),
    path('api/get_lenh_san_xuat_all/', views.get_lenh_san_xuat_all, name='get_lenh_san_xuat_all'),
    path('api/get_lenh_san_xuat_detail/', views.get_lenh_san_xuat_detail, name='get_lenh_san_xuat_detail'),
    path('api/check_rollback_exist/', views.check_rollback_exist, name='check_rollback_exist'),
    path('api/rollback/delete/<int:pk>/', views.rollback_delete, name='rollback_delete'),
    
    # PURCHASE URLs
    path('purchase/', views.purchase, name='purchase'),
    path('purchase/<int:pk>/', views.purchase_detail, name='purchase_detail'),
    path('purchase/create/', views.purchase_create, name='purchase_create'),
    path('api/purchase/delete/<int:pk>/', views.purchase_delete, name='purchase_delete'),
    path('api/purchase/lenh_sx_by_don_hang/<str:ma_don_hang>/', views.get_lenh_sx_by_don_hang, name='get_lenh_sx_by_don_hang'),
    path('api/purchase/materials/<str:ma_lenh_sx>/', views.get_purchase_materials_by_lenh_sx_api, name='get_purchase_materials_api'),
    path('api/nguoi/list/', views.get_nguoi_list, name='get_nguoi_list'),
    path('api/nguoi/detail/', views.get_nguoi_detail, name='get_nguoi_detail'),
    path('api/nguoi/add/', views.add_nguoi, name='add_nguoi'),
    path('purchase/<int:pk>/export-pdf/', views.purchase_export_pdf, name='purchase_export_pdf'),
    path('purchase/<int:pk>/export-excel/', views.purchase_export_excel, name='purchase_export_excel'),

    # WO URLs
    path("wo/", views.wo_ledger, name="wo_ledger"),
    path("wo/<int:pk>/", views.wo_ledger_detail, name="wo_ledger_detail"), 
    path("wo/create/", views.create_wo_record, name="wo_create"),
    # WO API URLs
    path("api/wo/delete/<int:pk>/", views.delete_wo_record, name="wo_delete"),
    path("api/get_lenh_san_xuat_wo/", views.get_lenh_san_xuat_for_wo, name="get_lenh_san_xuat_wo"),
    path("api/get_lenh_sx_by_don_hang_wo/<str:ma_don_hang>/", views.get_lenh_sx_by_don_hang_wo, name="get_lenh_sx_by_don_hang_wo"),
    path("api/get_purchase_records_by_lenh_sx_wo/<str:ma_lenh_sx>/", views.get_purchase_records_by_lenh_sx_wo, name="get_purchase_records_by_lenh_sx_wo"),
    path("api/wo/purchase_details/<int:purchase_id>/", views.get_purchase_details_wo, name="get_purchase_details_wo"),
    path("wo/<int:pk>/export/pdf/", views.wo_export_pdf, name="wo_export_pdf"),
    path("wo/<int:pk>/export/word/", views.wo_export_word, name="wo_export_word"),  
]