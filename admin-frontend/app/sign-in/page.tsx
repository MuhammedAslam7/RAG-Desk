// admin-frontend/app/sign-in/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  Input,
  VStack,
  Alert,
  Field,
  Stack,
  Center,
  AbsoluteCenter,
  Spinner,
} from "@chakra-ui/react";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function AdminSignInPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, isAdmin, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect to admin dashboard if already signed in as admin
  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) {
      router.replace("/");
    }
  }, [isLoaded, isSignedIn, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Log in via the normal auth endpoint
      await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // Step 2: Verify this user is an admin
      const verifyRes = await apiFetch("/api/v1/admin/verify", {
        method: "POST",
      });

      if (!verifyRes.ok) {
        // Not an admin — log out immediately
        await apiFetch("/api/v1/auth/logout", { method: "POST" });
        setError("Access denied. This account does not have admin privileges.");
        return;
      }

      // Step 3: Refresh the auth context and redirect
      await refresh();
      router.push("/");
    } catch (err: any) {
      const message = err.message ?? "";
      if (message.includes("401")) {
        setError("Invalid email or password.");
      } else if (message.includes("403")) {
        setError("Access denied. This account does not have admin privileges.");
      } else if (message.includes("Too many")) {
        setError("Too many attempts. Please try again in a few minutes.");
      } else {
        setError(message.replace(/^API \d+: /, "") || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (!isLoaded) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" color="teal.500" />
      </Center>
    );
  }

  // Already signed in as admin — redirect
  if (isSignedIn && isAdmin) {
    return (
      <Center minH="100vh">
        <Spinner size="lg" color="teal.500" />
      </Center>
    );
  }

  return (
    <Center minH="100vh" bg="bg.muted">
      <Container maxW="sm" py={12}>
        <VStack gap={8}>
          {/* Logo / Brand */}
          <VStack gap={2} textAlign="center">
            <Box
              w={12}
              h={12}
              bg="teal.500"
              borderRadius="xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text color="white" fontWeight="bold" fontSize="xl">
                A
              </Text>
            </Box>
            <Heading size="lg">Admin Panel</Heading>
            <Text color="fg.muted" fontSize="sm">
              Sign in to access the admin dashboard
            </Text>
          </VStack>

          {/* Sign In Form */}
          <Box
            w="full"
            bg="bg"
            p={8}
            borderRadius="xl"
            border="1px solid"
            borderColor="border"
          >
            <form onSubmit={handleSubmit}>
              <Stack gap={5}>
                <Field.Root required>
                  <Field.Label>Email</Field.Label>
                  <Input
                    type="email"
                    placeholder="admin@ragdesk.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    size="lg"
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>Password</Field.Label>
                  <PasswordInput
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    size="lg"
                  />
                </Field.Root>

                {error && (
                  <Alert.Root status="error" variant="subtle">
                    <Alert.Indicator />
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Root>
                )}

                <Button
                  type="submit"
                  colorPalette="teal"
                  size="lg"
                  w="full"
                  loading={loading}
                >
                  Sign In
                </Button>
              </Stack>
            </form>
          </Box>

          {/* Footer */}
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            RAG Desk Admin Panel — Authorized personnel only
          </Text>
        </VStack>
      </Container>
    </Center>
  );
}
