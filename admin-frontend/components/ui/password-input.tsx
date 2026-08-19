// admin-frontend/components/ui/password-input.tsx
"use client";

import { useState } from "react";
import {
  Input,
  InputGroup,
  IconButton,
  type InputProps,
} from "@chakra-ui/react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput(props: InputProps) {
  const [show, setShow] = useState(false);

  return (
    <InputGroup
      endElement={
        <IconButton
          variant="ghost"
          size="sm"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </IconButton>
      }
    >
      <Input
        type={show ? "text" : "password"}
        {...props}
      />
    </InputGroup>
  );
}
