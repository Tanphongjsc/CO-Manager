from django.db import models


class AnhChuKy(models.Model):
    id_anh = models.BigAutoField(primary_key=True)
    anh = models.TextField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'ANH_CHU_KY'


class BangKeCtc(models.Model):
    id_bang_ke_ctc = models.BigAutoField(primary_key=True)
    id_lenh_san_xuat = models.ForeignKey('LenhSanXuat', models.DO_NOTHING, db_column='id_lenh_san_xuat')
    id_anh = models.BigIntegerField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BANG_KE_CTC'


class BangKeThuMuaTuDan(models.Model):
    id_bang_ke_thu_mua_tu_dan = models.BigAutoField(primary_key=True)
    id_lenh_san_xuat = models.ForeignKey('LenhSanXuat', models.DO_NOTHING, db_column='id_lenh_san_xuat')
    id_san_pham = models.CharField()
    ngay_lap_giay_to = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BANG_KE_THU_MUA_TU_DAN'


class BangKeTruLuiNguyenLieu(models.Model):
    id_bang_ke_tru_lui = models.BigAutoField(primary_key=True)
    id_lenh_san_xuat = models.ForeignKey('LenhSanXuat', models.DO_NOTHING, db_column='id_lenh_san_xuat')
    id_san_pham = models.CharField()
    id_anh = models.BigIntegerField(blank=True, null=True)
    ten_nguyen_lieu = models.CharField(blank=True, null=True)
    so_luong_mua_vao = models.FloatField(blank=True, null=True)
    so_luong_san_xuat = models.FloatField(blank=True, null=True)
    thanh_pham_thu_hoi = models.FloatField(blank=True, null=True)
    so_luong_san_pham_xuat = models.FloatField(blank=True, null=True)
    so_luong_thanh_pham_ton_kho = models.FloatField(blank=True, null=True)
    ngay_thang = models.DateField(blank=True, null=True)
    trang_thai = models.CharField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BANG_KE_TRU_LUI_NGUYEN_LIEU'


class BangKeWo(models.Model):
    id = models.BigAutoField(primary_key=True)
    id_lenh_san_xuat = models.ForeignKey('LenhSanXuat', models.DO_NOTHING, db_column='id_lenh_san_xuat')
    id_san_pham = models.CharField(blank=True, null=True)
    id_nguoi = models.ForeignKey('Nguoi', models.DO_NOTHING, db_column='id_nguoi', blank=True, null=True)
    id_bang_ke_thu_mua_tu_dan = models.BigIntegerField(blank=True, null=True)
    to_khai_hai_quan = models.CharField(blank=True, null=True)
    dia_chi_thu_mua = models.TextField(blank=True, null=True)
    noi_khai_thac = models.TextField(blank=True, null=True)
    so_luong = models.IntegerField(blank=True, null=True)
    tri_gia_fob = models.FloatField(blank=True, null=True)
    ten_hang_hoa = models.CharField(blank=True, null=True)
    ngay = models.DateField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'BANG_KE_WO'


class CtBangKeCtc(models.Model):
    id_ct_bang_ke_ctc = models.BigAutoField(primary_key=True)
    id_bang_ke_ctc = models.ForeignKey(BangKeCtc, models.DO_NOTHING, db_column='id_bang_ke_ctc')
    id_san_pham = models.CharField()
    ten_nguyen_lieu = models.CharField(blank=True, null=True)
    don_gia = models.FloatField(blank=True, null=True)
    dinh_muc_san_pham_hao_hut = models.FloatField(blank=True, null=True)
    thanh_tien_co_xuat_xu_field = models.FloatField(db_column='thanh_tien (co_xuat_xu)', blank=True, null=True)  # Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    thanh_tien_khong_xuat_xu_field = models.FloatField(db_column='thanh_tien(khong_xuat_xu)', blank=True, null=True)  # Field renamed to remove unsuitable characters. Field renamed because it ended with '_'.
    nuoc_xuat_xu = models.CharField(blank=True, null=True)
    ngay_ke_bang_thu_mua = models.DateField(blank=True, null=True)
    so_ban_khai_bao = models.CharField(blank=True, null=True)
    ngay_bang_ke_wo = models.DateField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CT_BANG_KE_CTC'


class CtBangKeThuMuaTuDan(models.Model):
    id_ct_bang_ke_thu_mua_tu_dan = models.BigAutoField(primary_key=True)
    id_bang_ke_thu_mua_tu_dan = models.ForeignKey(BangKeThuMuaTuDan, models.DO_NOTHING, db_column='id_bang_ke_thu_mua_tu_dan')
    ten_nguyen_lieu = models.CharField(blank=True, null=True)
    don_gia = models.FloatField(blank=True, null=True)
    so_luong = models.FloatField(blank=True, null=True)
    id_nguoi_ban = models.ForeignKey('Nguoi', models.DO_NOTHING, db_column='id_nguoi_ban', blank=True, null=True)
    ngay_mua_hang = models.DateField(blank=True, null=True)
    id_anh = models.BigIntegerField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CT_BANG_KE_THU_MUA_TU_DAN'


class CtLenhSanXuat(models.Model):
    id_ct_lenh_san_xuat = models.BigAutoField(primary_key=True)
    id_lenh_san_xuat = models.ForeignKey('LenhSanXuat', models.DO_NOTHING, db_column='id_lenh_san_xuat')
    id_san_pham = models.ForeignKey('VatTu', models.DO_NOTHING, db_column='id_san_pham')
    ten_san_pham = models.CharField(blank=True, null=True)
    id_nguyen_vat_lieu = models.ForeignKey('VatTu', models.DO_NOTHING, db_column='id_nguyen_vat_lieu', related_name='ctlenhsanxuat_id_nguyen_vat_lieu_set')
    so_luong_san_pham = models.FloatField(blank=True, null=True)
    so_luong_nguyen_vat_lieu = models.FloatField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'CT_LENH_SAN_XUAT'


class LenhSanXuat(models.Model):
    id_lenh_san_xuat = models.CharField(primary_key=True)
    id_don_hang = models.CharField()
    ngay_tao_don_hang = models.DateField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'LENH_SAN_XUAT'
        db_table_comment = 'Tỷ lệ phối trộn'


class Nguoi(models.Model):
    id = models.BigAutoField(primary_key=True)
    ten = models.CharField()
    so_cmnd_cccd = models.CharField(blank=True, null=True)
    ngay_cap_cmnd_cccd = models.DateField(blank=True, null=True)
    dia_chi = models.TextField(blank=True, null=True)
    vai_tro = models.CharField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'NGUOI'
        db_table_comment = 'Thông tin người bán hoặc mua'


class VatTu(models.Model):
    ten_sp_chinh = models.CharField()
    ten_khac = models.CharField(blank=True, null=True)
    ma_hs = models.CharField()
    ty_le_thu_hoi = models.FloatField(blank=True, null=True)
    don_vi_tinh = models.CharField(blank=True, null=True)
    loai_sp = models.CharField(blank=True, null=True)
    ghi_chu = models.TextField(blank=True, null=True)
    id_san_pham = models.CharField(primary_key=True)

    class Meta:
        managed = False
        db_table = 'VAT_TU'
        db_table_comment = 'Bảng chứa nguyên vật liệu & Sản phẩm Link từ Cloudify sang'


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class AuthUser(models.Model):
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.CharField(max_length=254)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'auth_user'


class AuthUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_groups'
        unique_together = (('user', 'group'),)


class AuthUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)
    permission = models.ForeignKey(AuthPermission, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_user_user_permissions'
        unique_together = (('user', 'permission'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AuthUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'