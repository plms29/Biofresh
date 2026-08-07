"use client";

import { Search, Bell, User, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

export function Header() {
  const [isOnline] = useState(true);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-white/80 backdrop-blur-md flex items-center justify-between px-6 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm lô hàng, trái cây, nông trại..."
            className="pl-9 bg-cream/50 border-biofresh-200/50 focus:border-biofresh-400 focus:ring-biofresh-400/20 h-9 text-sm"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Online/Offline indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-biofresh-50 border border-biofresh-200">
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-biofresh-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-500" />
          )}
          <span className="text-[11px] font-medium text-biofresh-700">
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-biofresh-700 hover:bg-biofresh-50"
        >
          <Bell className="w-4 h-4" />
          <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-alert-orange border-white border-2">
            3
          </Badge>
        </Button>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="h-9 gap-2 px-2 hover:bg-biofresh-50 inline-flex items-center rounded-lg cursor-pointer">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-biofresh-100 text-biofresh-700 text-xs font-semibold">
                  NV
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs font-medium">Nguyễn Văn A</span>
                <span className="text-[10px] text-muted-foreground">
                  Quản lý HTX
                </span>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">
              Tài khoản
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs">
              <User className="w-3.5 h-3.5 mr-2" />
              Hồ sơ cá nhân
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-red-600">
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
