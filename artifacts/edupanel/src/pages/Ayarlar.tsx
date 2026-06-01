import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2, Bell, User, Shield } from "lucide-react";

export default function Ayarlar() {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Ayarlar</h1>
        <p className="text-sm text-slate-500 mt-1">Okul ve hesap ayarlarını yönet.</p>
      </div>

      {/* School Info */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Okul Bilgileri</CardTitle>
              <CardDescription className="text-xs mt-0.5">Kurumunuzun temel bilgilerini güncelleyin.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="school-name" className="text-sm">Okul Adı</Label>
              <Input id="school-name" defaultValue="Bright Minds Dil Okulu" data-testid="input-school-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-type" className="text-sm">Kurum Türü</Label>
              <Input id="school-type" defaultValue="Dil Okulu" data-testid="input-school-type" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-email" className="text-sm">E-posta</Label>
              <Input id="school-email" type="email" defaultValue="info@brightminds.edu.tr" data-testid="input-school-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-phone" className="text-sm">Telefon</Label>
              <Input id="school-phone" defaultValue="+90 212 555 00 00" data-testid="input-school-phone" />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="school-address" className="text-sm">Adres</Label>
              <Input id="school-address" defaultValue="Bağcılar Mah. Eğitim Cad. No:12, İstanbul" data-testid="input-school-address" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" data-testid="button-save-school">Kaydet</Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Bell className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Bildirim Tercihleri</CardTitle>
              <CardDescription className="text-xs mt-0.5">Hangi bildirimlerin gönderileceğini belirleyin.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-5">
          {[
            { id: "notif-late", label: "Geç Giriş Bildirimleri", desc: "Öğretmen geç girişlerinde anlık bildirim al.", defaultChecked: true },
            { id: "notif-absent", label: "Devamsızlık Bildirimleri", desc: "Öğretmen devamsızlığında acil bildirim al.", defaultChecked: true },
            { id: "notif-sub", label: "Vekil Talepleri", desc: "Yeni vekil talepleri oluştuğunda bildirim al.", defaultChecked: true },
            { id: "notif-approval", label: "Onay Bekleyen Saatler", desc: "Onay bekleyen saat raporları için haftalık özet.", defaultChecked: false },
            { id: "notif-report", label: "Aylık Raporlar", desc: "Aylık performans raporlarını e-posta ile al.", defaultChecked: false },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={item.id} className="text-sm font-medium cursor-pointer">{item.label}</Label>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>
              <Switch id={item.id} defaultChecked={item.defaultChecked} data-testid={`switch-${item.id}`} />
            </div>
          ))}
          <div className="flex justify-end pt-2">
            <Button size="sm" data-testid="button-save-notifications">Kaydet</Button>
          </div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Kullanıcı Hesabı</CardTitle>
              <CardDescription className="text-xs mt-0.5">Kişisel bilgilerinizi ve şifrenizi yönetin.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="user-name" className="text-sm">Ad Soyad</Label>
              <Input id="user-name" defaultValue="Admin Kullanıcı" data-testid="input-user-name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-role" className="text-sm">Rol</Label>
              <div className="flex items-center gap-2 h-9">
                <Badge className="bg-blue-500/15 text-blue-700 border-blue-200">Yönetici</Badge>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email" className="text-sm">E-posta</Label>
              <Input id="user-email" type="email" defaultValue="admin@brightminds.edu.tr" data-testid="input-user-email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password" className="text-sm">Yeni Şifre</Label>
              <Input id="user-password" type="password" placeholder="••••••••" data-testid="input-user-password" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" data-testid="button-save-account">Kaydet</Button>
          </div>
        </CardContent>
      </Card>

      {/* Plan Info */}
      <Card className="shadow-sm border-slate-200/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Shield className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-base font-medium">Plan ve Abonelik</CardTitle>
              <CardDescription className="text-xs mt-0.5">Mevcut plan bilgileriniz.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">EduPanel Pro</p>
              <p className="text-xs text-slate-500 mt-0.5">Bir sonraki yenileme: 1 Temmuz 2026</p>
            </div>
            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200">Aktif</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
