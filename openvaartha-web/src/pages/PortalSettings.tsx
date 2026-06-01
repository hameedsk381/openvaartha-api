import { useState, useEffect } from "react";
import { Bell, Lock, User, Shield, ChevronRight, Palette, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function PortalSettings() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [passwordData, setPasswordData] = useState({ current: "", new: "" });

  const [notifications, setNotifications] = useState({
    breaking: true,
    morning: true,
    newsletter: false,
  });

  const [appearance, setAppearance] = useState({
    theme: localStorage.getItem('theme') || 'System default',
    fontSize: localStorage.getItem('font-size') || 'Medium',
  });

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setAppearance({
          theme: data.theme || localStorage.getItem('theme') || 'System default',
          fontSize: data.fontSize || localStorage.getItem('font-size') || 'Medium',
        });
      }
    } catch (err) {
      console.error("Failed to fetch user profile", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (field: string, value: string) => {
    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { [field]: value };
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        if (field === 'email') localStorage.setItem('user_email', value);
        toast.success(`${field.replace('_', ' ')} updated successfully`);
        setEditMode(null);
      } else {
        const err = await response.json();
        toast.error(err.detail || "Update failed");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (!passwordData.current) {
      toast.error("Current password is required");
      return;
    }

    setIsUpdating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: passwordData.new,
          current_password: passwordData.current
        })
      });

      if (response.ok) {
        toast.success("Password updated successfully");
        setPasswordData({ current: "", new: "" });
      } else {
        const err = await response.json();
        toast.error(err.detail || "Update failed");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setIsUpdating(false);
    }
  };

  const updateAppearance = async (type: 'theme' | 'fontSize', value: string) => {
    setAppearance(p => ({ ...p, [type]: value }));
    localStorage.setItem(type === 'theme' ? 'theme' : 'font-size', value);
    
    // Apply instantly
    const root = window.document.documentElement;
    if (type === 'theme') {
      if (value === 'Dark') root.classList.add('dark');
      else if (value === 'Light') root.classList.remove('dark');
      else {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
    } else {
      const sizes: Record<string, string> = { 'Small': '14px', 'Medium': '16px', 'Large': '18px' };
      root.style.fontSize = sizes[value] || '16px';
    }

    // Dispatch event for App.tsx or other components to listen
    window.dispatchEvent(new Event('appearance-change'));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(type === 'theme' ? { theme: value } : { font_size: value })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        toast.success(`${type} preference saved`);
      } else {
        toast.error("Preference saved locally only");
      }
    } catch (err) {
      toast.error("Preference saved locally only");
    }
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
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
        <SettingsRow label="Avatar" value="Change photo" chevron />
      </SettingsSection>

      {/* ── Security ────────────────────────────────── */}
      <SettingsSection label="Security" icon={Shield}>
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
              {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : "Update Password"}
            </button>
          </div>
        </div>
      </SettingsSection>

      {/* ── Appearance ─────────────────────────────── */}
      <SettingsSection label="Appearance" icon={Palette}>
        <SelectRow 
          label="Theme" 
          value={appearance.theme} 
          options={['Light', 'Dark', 'System default']}
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
          description="Instant high-priority alerts"
          checked={notifications.breaking}
          onChange={v => setNotifications(p => ({ ...p, breaking: v }))}
        />
        <ToggleRow
          label="Morning Briefing"
          description="Daily 8 AM summary"
          checked={notifications.morning}
          onChange={v => setNotifications(p => ({ ...p, morning: v }))}
        />
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
        <button onClick={() => { onSave(val); setIsEditing(false); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md"><Save className="h-4 w-4" /></button>
        <button onClick={() => { setVal(value); setIsEditing(false); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><X className="h-4 w-4" /></button>
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

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm font-semibold">{label}</span>
      <select 
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent text-sm text-muted-foreground font-medium focus:outline-none cursor-pointer"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors press shrink-0 ${checked ? 'bg-primary' : 'bg-muted'}`}
        role="switch"
        aria-checked={checked}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'left-5' : 'left-1'}`} />
      </button>
    </div>
  );
}
