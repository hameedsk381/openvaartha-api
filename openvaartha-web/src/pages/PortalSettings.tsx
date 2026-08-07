import { useState, useEffect } from "react";
import { Shield, Palette, Save } from "lucide-react";
import { AnimatedIcon } from "@/components/ui/animated-icon";
import { Bell } from "@/components/animate-ui/icons/bell";
import { Lock } from "@/components/animate-ui/icons/lock";
import { User } from "@/components/animate-ui/icons/user";
import { ChevronRight } from "@/components/animate-ui/icons/chevron-right";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { X } from "@/components/animate-ui/icons/x";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { z } from "zod";
import { Switch } from "@/components/animate-ui/components/headless/switch";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function PortalSettings() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [passwordData, setPasswordData] = useState({ current: "", new: "" });

  const push = usePushNotifications();
  // Start false rather than trusting a stale localStorage flag — a toggle
  // showing "on" before a real browser subscription exists would be exactly
  // the fake-preference problem this replaces. Reconciled against the actual
  // subscription state on mount, below.
  const [notifications, setNotifications] = useState({ breaking: false, morning: false });

  useEffect(() => {
    push.getExistingSubscription().then((sub) => {
      if (sub) {
        setNotifications({
          breaking: localStorage.getItem("notify_breaking") !== "false",
          morning: localStorage.getItem("notify_morning") !== "false",
        });
      } else {
        localStorage.setItem("notify_breaking", "false");
        localStorage.setItem("notify_morning", "false");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNotificationToggle = async (flag: "breaking" | "morning", value: boolean) => {
    const previous = notifications;
    const next = { ...notifications, [flag]: value };
    setNotifications(next);
    localStorage.setItem(`notify_${flag}`, String(value));

    try {
      const existing = await push.getExistingSubscription();
      if (!existing && value) {
        await push.subscribe(next);
        toast.success("Notifications enabled");
      } else if (existing && !next.breaking && !next.morning) {
        await push.unsubscribe();
        toast.success("Notifications turned off");
      } else if (existing) {
        await push.updatePreferences({ [flag]: value });
        toast.success("Notification preferences saved");
      }
    } catch (err) {
      // Revert — don't let the toggle claim a state that failed to apply
      // (e.g. the browser blocked the permission prompt).
      setNotifications(previous);
      localStorage.setItem(`notify_${flag}`, String(previous[flag]));
      toast.error(err instanceof Error ? err.message : "Failed to update notifications");
    }
  };

  const [appearance, setAppearance] = useState({
    theme: (localStorage.getItem('theme') || 'light').toLowerCase(),
    fontSize: localStorage.getItem('font-size') || 'Medium',
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const data = await apiFetch<any>("/users/me");
      setUser(data);
      setAppearance({
        theme: (data.theme || localStorage.getItem('theme') || 'light').toLowerCase(),
        fontSize: data.fontSize || localStorage.getItem('font-size') || 'Medium',
      });
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    setIsUpdating(true);
    try {
      const payload = { [field]: value };
      const updatedUser = await apiFetch<any>("/users/me", {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setUser(updatedUser);
      if (field === 'email') localStorage.setItem('user_email', value);
      toast.success(`${field.replace('_', ' ')} updated successfully`);
      setEditMode(null);
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setIsUpdating(false);
    }
  };

  const passwordSchema = z.object({
    current: z.string().min(1, "Current password is required"),
    new: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  });

  const handlePasswordChange = async () => {
    try {
      passwordSchema.parse(passwordData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsUpdating(true);
    try {
      await apiFetch("/users/me", {
        method: 'PUT',
        body: JSON.stringify({
          password: passwordData.new,
          current_password: passwordData.current
        })
      });
      toast.success("Password updated successfully");
      setPasswordData({ current: "", new: "" });
    } catch (err: any) {
      toast.error(err.message || "Update failed. Please check your current password.");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateAppearance = async (type: 'theme' | 'fontSize', value: string) => {
    const normalized = type === 'theme' ? value.toLowerCase() : value;
    setAppearance(p => ({ ...p, [type]: type === 'theme' ? normalized : value }));
    localStorage.setItem(type === 'theme' ? 'theme' : 'font-size', normalized);

    // Apply instantly
    const root = window.document.documentElement;
    if (type === 'theme') {
      const isDark = normalized === 'dark' || (normalized === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', isDark);
    } else {
      const sizes: Record<string, string> = { 'Small': '14px', 'Medium': '16px', 'Large': '18px' };
      root.style.fontSize = sizes[value] || '16px';
    }

    // Dispatch event for App.tsx or other components to listen
    window.dispatchEvent(new Event('appearance-change'));

    try {
      const updatedUser = await apiFetch<any>("/users/me", {
        method: 'PUT',
        body: JSON.stringify(type === 'theme' ? { theme: normalized } : { font_size: value })
      });
      setUser(updatedUser);
      toast.success(`${type} preference saved`);
    } catch (err) {
      toast.error("Preference saved locally only");
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoaderCircle className="h-8 w-8 text-primary" animate />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg pb-10">
      <div>
        <p className="overline mb-1">Preferences</p>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
      </div>

      {/* ── Profile ────────────────────────────────── */}
      <SettingsSection label="Profile" icon={User}>
        <EditableRow 
          label="Display Name" 
          value={user?.fullName || "Not set"} 
          onSave={(val) => handleUpdate('full_name', val)}
          isUpdating={isUpdating}
        />
        <EditableRow 
          label="Email" 
          value={user?.email || "Not set"} 
          onSave={(val) => handleUpdate('email', val)}
          isUpdating={isUpdating}
        />
        <SettingsRow 
          label="Account Type" 
          value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"} 
        />
        <div className="flex items-center justify-between p-4 border-b border-border hover:bg-secondary/10 transition-colors cursor-pointer"
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = ev => {
              const file = (ev.target as HTMLInputElement).files?.[0];
              if (file) {
                const uploadAvatar = async (file: File) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  toast.loading("Uploading avatar...", { id: "upload-avatar" });
                  try {
                    const res = await apiFetch<{ url: string }>("/upload/", {
                      method: "POST",
                      body: formData,
                    });
                    handleUpdate("avatar_url", res.url);
                    toast.success("Avatar uploaded successfully", { id: "upload-avatar" });
                  } catch (err) {
                    toast.error("Failed to upload avatar", { id: "upload-avatar" });
                  }
                };
                uploadAvatar(file);
              }
            };
            input.click();
          }}
        >
          <div className="flex items-center gap-3">
            {user?.avatarUrl || user?.avatar_url ? (
              <img src={user.avatarUrl || user.avatar_url} alt="Avatar" className="h-10 w-10 rounded-full object-cover border border-border" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold">Avatar</p>
              <p className="text-xs text-muted-foreground">Click to upload a custom profile picture</p>
            </div>
          </div>
          <span className="text-xs text-primary font-semibold">Change</span>
        </div>
      </SettingsSection>

      {/* ── Security ────────────────────────────────── */}
      <SettingsSection label="Security" icon={Shield}>
        {user?.authProvider === "google" ? (
          <div className="p-4 space-y-1.5">
            <p className="text-sm font-semibold">Signed in with Google</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This account has no separate Open Vaartha password — you sign in through Google,
              so your password is managed there, not here.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold">Change Password</p>
            <div className="space-y-2">
              <input
                type="password"
                placeholder="Current password"
                className="w-full h-11 px-3 bg-secondary/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={passwordData.current}
                onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))}
              />
              <input
                type="password"
                placeholder="New password"
                className="w-full h-11 px-3 bg-secondary/30 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={passwordData.new}
                onChange={e => setPasswordData(p => ({ ...p, new: e.target.value }))}
              />
              <button
                onClick={handlePasswordChange}
                disabled={isUpdating || !passwordData.new || !passwordData.current}
                className="w-full h-11 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                {isUpdating ? <LoaderCircle className="h-3 w-3 mx-auto" animate /> : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </SettingsSection>

      {/* ── Appearance ─────────────────────────────── */}
      <SettingsSection label="Appearance" icon={Palette}>
        <SelectRow 
          label="Theme" 
          value={appearance.theme} 
          options={['light', 'dark']}
          optionLabels={{ light: 'Light', dark: 'Dark' }}
          onChange={(val) => updateAppearance('theme', val)}
        />
        <SelectRow 
          label="Font Size" 
          value={appearance.fontSize} 
          options={['Small', 'Medium', 'Large']}
          onChange={(val) => updateAppearance('fontSize', val)}
        />
      </SettingsSection>

      {/* ── Notifications ──────────────────────────── */}
      <SettingsSection label="Notifications" icon={Bell}>
        <ToggleRow
          label="Breaking News"
          description="Instant high-priority alerts (this device only)"
          checked={notifications.breaking}
          onChange={v => handleNotificationToggle("breaking", v)}
        />
        <ToggleRow
          label="Morning Briefing"
          description="Daily 8 AM summary (this device only)"
          checked={notifications.morning}
          onChange={v => handleNotificationToggle("morning", v)}
        />
      </SettingsSection>

      {/* ── Contributor ─────────────────────────────── */}
      <SettingsSection label="Contributor" icon={Shield}>
        <div className="p-4 space-y-3">
          <p className="text-sm font-semibold">Columnist Program</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Submit opinion articles to OpenVaartha. Share your expertise, local stories, or deep-dive analysis directly with our readers.
          </p>
          {user?.role === "contributor" ? (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 dark:text-green-400">
              ✓ Approved Contributor
            </div>
          ) : user?.contributorStatus === "requested" ? (
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs font-semibold text-yellow-600 dark:text-yellow-400">
              Pending editor review
            </div>
          ) : user?.contributorStatus === "rejected" ? (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400">
                Application status: rejected
              </div>
              <button
                onClick={async () => {
                  try {
                    const data = await apiFetch<any>("/users/me/contributor-request", { method: "POST" });
                    setUser(data);
                    toast.success("Contributor request submitted again");
                  } catch (err: any) {
                    toast.error(err.message || "Failed to submit request");
                  }
                }}
                className="w-full h-10 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors press"
              >
                Re-apply for Contributor Access
              </button>
            </div>
          ) : (
            <button
              onClick={async () => {
                try {
                  const data = await apiFetch<any>("/users/me/contributor-request", { method: "POST" });
                  setUser(data);
                  toast.success("Contributor request submitted");
                } catch (err: any) {
                  toast.error(err.message || "Failed to submit request");
                }
              }}
              className="w-full h-10 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors press"
            >
              Request Contributor Access
            </button>
          )}
        </div>
      </SettingsSection>
    </div>
  );
}

/* ── Components ─────────────────────────────────── */

function EditableRow({ label, value, onSave, isUpdating }: { label: string; value: string; onSave: (v: string) => void; isUpdating: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3">
        <input 
          autoFocus
          className="flex-1 bg-secondary/30 border border-border rounded-md px-2 py-1 text-sm focus:outline-none"
          value={val}
          onChange={e => setVal(e.target.value)}
        />
        <button onClick={() => { onSave(val); setIsEditing(false); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"><AnimatedIcon animationType="scale"><Save className="h-4 w-4" /></AnimatedIcon></button>
        <button onClick={() => { setVal(value); setIsEditing(false); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><X className="h-4 w-4" animateOnHover /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 group cursor-pointer" onClick={() => setIsEditing(true)}>
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium">{value}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function SelectRow({ label, value, options, onChange, optionLabels }: { label: string; value: string; options: string[]; onChange: (v: string) => void; optionLabels?: Record<string, string> }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm font-semibold">{label}</span>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-sm text-muted-foreground font-medium focus:outline-none cursor-pointer"
      >
        {options.map(opt => <option key={opt} value={opt}>{optionLabels?.[opt] ?? opt}</option>)}
      </select>
    </div>
  );
}

function SettingsSection({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <span className="overline text-primary">{label}</span>
      </div>
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border bg-card">
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, value, chevron }: { label: string; value: string; chevron?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-4 ${chevron ? 'cursor-pointer hover:bg-[hsl(var(--surface-3))] transition-colors press' : ''}`}>
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="font-medium">{value}</span>
        {chevron && <ChevronRight className="h-3.5 w-3.5" />}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-[hsl(var(--surface-2))] transition-colors">
      <div className="space-y-0.5">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[10px] font-medium text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
