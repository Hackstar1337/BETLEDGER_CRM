import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Timezone settings
  const [selectedTimezone, setSelectedTimezone] = useState("GMT+5:30");

  // Common timezones
  const timezones = [
    { value: "GMT-12:00", label: "GMT-12:00 (Baker Island)" },
    { value: "GMT-11:00", label: "GMT-11:00 (American Samoa)" },
    { value: "GMT-10:00", label: "GMT-10:00 (Hawaii)" },
    { value: "GMT-9:00", label: "GMT-9:00 (Alaska)" },
    { value: "GMT-8:00", label: "GMT-8:00 (Pacific)" },
    { value: "GMT-7:00", label: "GMT-7:00 (Mountain)" },
    { value: "GMT-6:00", label: "GMT-6:00 (Central)" },
    { value: "GMT-5:00", label: "GMT-5:00 (Eastern)" },
    { value: "GMT-4:00", label: "GMT-4:00 (Atlantic)" },
    { value: "GMT-3:00", label: "GMT-3:00 (Brazil)" },
    { value: "GMT-2:00", label: "GMT-2:00 (Mid-Atlantic)" },
    { value: "GMT-1:00", label: "GMT-1:00 (Azores)" },
    { value: "GMT+0:00", label: "GMT+0:00 (London)" },
    { value: "GMT+1:00", label: "GMT+1:00 (Berlin)" },
    { value: "GMT+2:00", label: "GMT+2:00 (Cairo)" },
    { value: "GMT+3:00", label: "GMT+3:00 (Moscow)" },
    { value: "GMT+4:00", label: "GMT+4:00 (Dubai)" },
    { value: "GMT+5:00", label: "GMT+5:00 (Karachi)" },
    { value: "GMT+5:30", label: "GMT+5:30 (India - IST)" },
    { value: "GMT+6:00", label: "GMT+6:00 (Dhaka)" },
    { value: "GMT+7:00", label: "GMT+7:00 (Bangkok)" },
    { value: "GMT+8:00", label: "GMT+8:00 (Beijing)" },
    { value: "GMT+9:00", label: "GMT+9:00 (Tokyo)" },
    { value: "GMT+10:00", label: "GMT+10:00 (Sydney)" },
    { value: "GMT+11:00", label: "GMT+11:00 (Solomon Islands)" },
    { value: "GMT+12:00", label: "GMT+12:00 (New Zealand)" },
  ];

  // Load saved timezone from localStorage
  useEffect(() => {
    const savedTimezone = localStorage.getItem("appTimezone");
    if (savedTimezone) {
      setSelectedTimezone(savedTimezone);
    }
  }, []);

  // Save timezone to localStorage
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone);
    localStorage.setItem("appTimezone", timezone);
    toast.success("Timezone updated successfully");
  };

  const changePasswordMutation = trpc.standaloneAuth.changePassword.useMutation(
    {
      onSuccess: () => {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      },
      onError: error => {
        toast.error(error.message || "Failed to change password");
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    // Password strength validation
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      toast.error(
        "Password must contain uppercase, lowercase, number, and special character"
      );
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen p-3">
        <div className="space-y-3">
          {/* Modern Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm border border-slate-200">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                  <p className="text-slate-600 text-sm mt-1">Manage your account settings and preferences</p>
                </div>
                <div className="p-2 bg-white/80 rounded-lg border border-slate-200">
                  <Lock className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-200">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Change Password</h3>
                  <p className="text-sm text-slate-600">Update your password to keep your account secure. Use a strong password with at least 8 characters.</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-sm font-semibold text-slate-700">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      disabled={changePasswordMutation.isPending}
                      className="border-slate-300 focus:border-emerald-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-700">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      disabled={changePasswordMutation.isPending}
                      className="border-slate-300 focus:border-emerald-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>
                  <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      disabled={changePasswordMutation.isPending}
                      className="border-slate-300 focus:border-emerald-300"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-slate-400" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={changePasswordMutation.isPending}
                  className="w-full bg-gradient-to-r from-emerald-100 to-teal-100 hover:from-emerald-200 hover:to-teal-200 text-emerald-700 border border-emerald-200"
                >
                  {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                </Button>
              </form>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg border border-blue-200">
                  <Lock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Password Requirements</h3>
                  <p className="text-sm text-slate-600">Your password must meet the following criteria:</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">At least 8 characters long</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">Contains at least one uppercase letter (A-Z)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">Contains at least one lowercase letter (a-z)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">Contains at least one number (0-9)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  <span className="text-slate-700">Contains at least one special character (!@#$%^&*...)</span>
                </li>
              </ul>
            </div>
          </div>

        {/* Timezone Settings */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-violet-100 rounded-lg border border-violet-200">
                  <Clock className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Timezone Settings</h3>
                  <p className="text-sm text-slate-600">Configure the timezone for Today's Players Report and other time-based reports</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone" className="text-sm font-semibold text-slate-700">Select Timezone</Label>
                  <Select
                    value={selectedTimezone}
                    onValueChange={handleTimezoneChange}
                  >
                    <SelectTrigger id="timezone" className="border-slate-300 focus:border-violet-300">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(timezone => (
                        <SelectItem key={timezone.value} value={timezone.value}>
                          {timezone.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-slate-600">
                  <p>
                    Current selection:{" "}
                    <strong className="text-slate-900">
                      {timezones.find(tz => tz.value === selectedTimezone)?.label}
                    </strong>
                  </p>
                  <p className="mt-1">This timezone will be used for:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Today's Players Report (24-hour window)</li>
                    <li>Daily report generation</li>
                    <li>Other time-based analytics</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
