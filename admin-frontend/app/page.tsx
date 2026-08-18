"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  HStack,
  VStack,
  Flex,
  Card,
  Badge,
  Avatar,
  Input,
  Separator,
  Icon,
  Stack,

  SimpleGrid,
  Stat,
  Alert,
  CloseButton,
} from "@chakra-ui/react";

export default function Home() {
  return (
    <Container maxW="container.xl" py={8}>
      {/* Header */}
      <Flex justify="space-between" align="center" mb={8}>
        <VStack align="start" gap={0}>
          <Heading size="2xl" color="fg.default">
            RAG Desk Admin
          </Heading>
          <Text color="fg.muted">Admin Dashboard — Powered by Chakra UI</Text>
        </VStack>
        <HStack gap={3}>
          <Button variant="outline" size="sm">
            Docs
          </Button>
          <Button colorPalette="teal" size="sm">
            Get Started
          </Button>
        </HStack>
      </Flex>

      <Separator mb={8} />

      {/* Stats Row */}
      <SimpleGrid columns={{ base: 1, md: 4 }} gap={4} mb={8}>
        {[
          { label: "Total Users", value: "1,234", change: "+12%" },
          { label: "Active Chats", value: "56", change: "+5%" },
          { label: "Knowledge Sources", value: "89", change: "+8%" },
          { label: "Avg Response Time", value: "1.2s", change: "-3%" },
        ].map((stat) => (
          <Card.Root key={stat.label} size="sm">
            <Card.Body>
              <Stat.Root>
                <Stat.Label>{stat.label}</Stat.Label>
                <HStack justify="space-between">
                  <Stat.ValueText>{stat.value}</Stat.ValueText>
                  <Badge
                    colorPalette={stat.change.startsWith("+") ? "green" : "red"}
                    size="sm"
                    variant="subtle"
                  >
                    {stat.change}
                  </Badge>
                </HStack>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        ))}
      </SimpleGrid>

      {/* Content Grid */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={8}>
        {/* Recent Activity Card */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Recent Activity</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={4}>
              {[
                {
                  name: "Sarah Chen",
                  action: "added a new knowledge source",
                  time: "2 min ago",
                  color: "bg.green.500",
                },
                {
                  name: "James Wilson",
                  action: "updated widget settings",
                  time: "15 min ago",
                  color: "bg.blue.500",
                },
                {
                  name: "Maria Garcia",
                  action: "resolved a customer chat",
                  time: "1 hour ago",
                  color: "bg.purple.500",
                },
                {
                  name: "Alex Thompson",
                  action: "invited a new team member",
                  time: "3 hours ago",
                  color: "bg.orange.500",
                },
              ].map((item, i) => (
                <HStack key={i} gap={3}>
                  <Avatar.Root size="sm">
                    <Avatar.Fallback name={item.name} />
                  </Avatar.Root>
                  <Box flex="1">
                    <Text fontSize="sm" fontWeight="medium">
                      {item.name}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {item.action}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
                    {item.time}
                  </Text>
                </HStack>
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Quick Actions Card */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Quick Actions</Heading>
          </Card.Header>
          <Card.Body>
            <Stack gap={3}>
              <Alert.Root status="info" variant="subtle">
                <Alert.Indicator />
                <Box flex="1">
                  <Alert.Title>System Update</Alert.Title>
                  <Alert.Description>
                    A new version of the knowledge engine is available. Update to
                    get improved embeddings.
                  </Alert.Description>
                </Box>
                <CloseButton size="xs" />
              </Alert.Root>

              <Text fontSize="sm" fontWeight="medium" pt={2}>
                Management
              </Text>
              <HStack gap={3} flexWrap="wrap">
                <Button size="sm" variant="subtle" colorPalette="teal">
                  Manage Users
                </Button>
                <Button size="sm" variant="subtle" colorPalette="blue">
                  Knowledge Base
                </Button>
                <Button size="sm" variant="subtle" colorPalette="purple">
                  Widget Config
                </Button>
                <Button size="sm" variant="subtle" colorPalette="orange">
                  Billing
                </Button>
              </HStack>

              <Text fontSize="sm" fontWeight="medium" pt={2}>
                API Status
              </Text>
              <HStack gap={2}>
                <Badge colorPalette="green" variant="solid" size="sm">
                  API Online
                </Badge>
                <Badge colorPalette="green" variant="solid" size="sm">
                  Database OK
                </Badge>
                <Badge colorPalette="green" variant="solid" size="sm">
                  Embeddings Ready
                </Badge>
              </HStack>
            </Stack>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Code Sample */}
      <Card.Root mb={8}>
        <Card.Header>
          <Heading size="md">System Info</Heading>
        </Card.Header>
        <Card.Body>
          <Box as="pre" p={4} fontSize="sm" borderRadius="md" bg="bg.muted" overflowX="auto" fontFamily="mono">
            {`// Chakra UI v3 is now active in admin-frontend
// Components available: Button, Card, Badge, Avatar, Input,
// Heading, Text, Stack, Grid, Alert, Stat, and many more.

import { Button } from "@chakra-ui/react";

export default function Demo() {
  return <Button colorPalette="teal">Click me</Button>;
}`}
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Footer */}
      <Separator />
      <Flex justify="center" py={4}>
        <Text fontSize="sm" color="fg.muted">
          RAG Desk Admin • Built with Chakra UI v3 + Next.js
        </Text>
      </Flex>
    </Container>
  );
}
