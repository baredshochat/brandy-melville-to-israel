import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from "@/entities/User";

export default function SheetNav({ navLinks, location }) {
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await User.logout();
      window.location.reload();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 sm:w-80 p-0">
        <SheetHeader className="p-4 sm:p-6 border-b">
          <SheetTitle className="text-base sm:text-lg text-right">תפריט</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-4 sm:p-6 space-y-1 sm:space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === createPageUrl(link.name);
            return (
              <Link
                key={link.name}
                to={createPageUrl(link.name)}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-none transition-colors text-sm sm:text-base ${
                  isActive
                    ? "bg-stone-100 text-stone-900"
                    : "text-stone-700 hover:bg-stone-50 hover:text-stone-900"
                }`}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
          <div className="border-t pt-2 sm:pt-4 mt-2 sm:mt-4">
            <Button 
              variant="ghost" 
              onClick={handleLogout}
              className="w-full justify-start gap-2 sm:gap-3 p-2 sm:p-3 text-sm sm:text-base text-stone-700 hover:bg-stone-50"
            >
              התנתקות
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}