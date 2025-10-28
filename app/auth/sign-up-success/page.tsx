import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <Card className="border-indigo-100">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-indigo-900">Check your email</CardTitle>
            <CardDescription className="text-gray-600">
              We&apos;ve sent you a confirmation email. Please check your inbox and click the link to verify your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/auth/login" className="text-indigo-600 hover:text-indigo-700 underline underline-offset-4">
              Return to login
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
