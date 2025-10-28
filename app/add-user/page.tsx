"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { UserPlus, Loader2, Pencil, Trash2, X, Check, ShieldAlert, Key } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
  last_sign_in?: string
  email_confirmed?: boolean
}

export default function AddUserPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ full_name: "", email: "", role: "" })
  const [userRole, setUserRole] = useState<string | null>(null)
  const [changingPasswordUserId, setChangingPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null)
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
      } else {
        const role = user.user_metadata?.role || "user"
        setUserRole(role)

        if (role !== "superAdmin") {
          setIsCheckingAuth(false)
          return
        }

        setIsAuthenticated(true)
        loadUsers()
      }
      setIsCheckingAuth(false)
    }

    checkAuth()
  }, [router])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch("/api/users")
      const data = await response.json()

      if (data.error) throw new Error(data.error)
      setUsers(data.users || [])
    } catch (err: any) {
      console.error("[v0] Error loading users:", err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!fullName.trim()) {
      setError("Full name is required")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/adkUM`,
          data: {
            full_name: fullName.trim(),
            display_name: fullName.trim(),
          },
        },
      })

      if (error) throw error

      if (data.user) {
        setSuccess(true)
        setEmail("")
        setPassword("")
        setConfirmPassword("")
        setFullName("")
        setTimeout(() => {
          setSuccess(false)
          loadUsers()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (user: User) => {
    setEditingUserId(user.id)
    setEditForm({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    })
  }

  const cancelEdit = () => {
    setEditingUserId(null)
    setEditForm({ full_name: "", email: "", role: "" })
  }

  const saveEdit = async (userId: string) => {
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: editForm.email,
          full_name: editForm.full_name,
          role: editForm.role,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      setEditingUserId(null)
      loadUsers()
    } catch (err: any) {
      console.error("[v0] Error updating user:", err)
      alert("Failed to update user: " + err.message)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to delete user: ${userEmail}?`)) {
      return
    }

    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      loadUsers()
    } catch (err: any) {
      console.error("[v0] Error deleting user:", err)
      alert("Failed to delete user: " + err.message)
    }
  }

  const startPasswordChange = (userId: string) => {
    setChangingPasswordUserId(userId)
    setNewPassword("")
    setConfirmNewPassword("")
    setPasswordChangeError(null)
  }

  const cancelPasswordChange = () => {
    setChangingPasswordUserId(null)
    setNewPassword("")
    setConfirmNewPassword("")
    setPasswordChangeError(null)
  }

  const savePasswordChange = async () => {
    setPasswordChangeError(null)

    if (newPassword.length < 6) {
      setPasswordChangeError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeError("Passwords do not match")
      return
    }

    setPasswordChangeLoading(true)

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: changingPasswordUserId,
          newPassword: newPassword,
        }),
      })

      const data = await response.json()
      if (data.error) throw new Error(data.error)

      alert("Password changed successfully!")
      cancelPasswordChange()
    } catch (err: any) {
      console.error("[v0] Error changing password:", err)
      setPasswordChangeError(err.message || "Failed to change password")
    } finally {
      setPasswordChangeLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated || userRole !== "superAdmin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Card className="p-8 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to access this page. Only superAdmin users can manage user accounts.
          </p>
          <div className="pt-4">
            <Button onClick={() => router.push("/")} className="w-full">
              Return to Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Add New User</h1>
            <p className="text-muted-foreground">Create a new user account for the system</p>
          </div>

          {success && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
              <p className="font-medium">User created successfully!</p>
              <p className="text-sm mt-1">
                The user will receive an email to verify their account before they can log in.
              </p>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                  minLength={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm the password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating user...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/adkUM")} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>

          <div className="text-center pt-4 border-t">
            <Link href="/adkUM" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Link>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">All Users</h2>
              <p className="text-sm text-muted-foreground">Manage user accounts from Supabase Authentication</p>
            </div>
            <Button onClick={loadUsers} variant="outline" size="sm" disabled={loadingUsers}>
              {loadingUsers ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-sm">Full Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm">Created</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-secondary/50">
                      {editingUserId === user.id ? (
                        <>
                          <td className="py-3 px-4">
                            <Input
                              value={editForm.full_name}
                              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              value={editForm.email}
                              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                              className="h-8"
                              type="email"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <Input
                              value={editForm.role}
                              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                              className="h-8"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.email_confirmed
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-yellow-500/10 text-yellow-600"
                              }`}
                            >
                              {user.email_confirmed ? "Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => saveEdit(user.id)}>
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 px-4 font-medium">{user.full_name || "-"}</td>
                          <td className="py-3 px-4 text-sm">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.email_confirmed
                                  ? "bg-green-500/10 text-green-600"
                                  : "bg-yellow-500/10 text-yellow-600"
                              }`}
                            >
                              {user.email_confirmed ? "Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="ghost" onClick={() => startEdit(user)} title="Edit user">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startPasswordChange(user.id)}
                                title="Change password"
                              >
                                <Key className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteUser(user.id, user.email)}
                                className="text-destructive hover:text-destructive"
                                title="Delete user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {changingPasswordUserId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Change Password</h3>
              <Button size="sm" variant="ghost" onClick={cancelPasswordChange}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min. 6 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordChangeLoading}
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  disabled={passwordChangeLoading}
                  minLength={6}
                />
              </div>

              {passwordChangeError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {passwordChangeError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button onClick={savePasswordChange} className="flex-1" disabled={passwordChangeLoading}>
                  {passwordChangeLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={cancelPasswordChange} disabled={passwordChangeLoading}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
