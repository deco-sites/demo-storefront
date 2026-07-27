import { useUser } from "../../platform/user";
import Button from "../ui/Button";

interface Props {
  variant: "mobile" | "desktop";
}

/** The Figma "Action button" — plain text, no icon: "Account" or "Login". */
function SignIn({ variant }: Props) {
  const { isAuthenticated } = useUser();

  if (isAuthenticated) {
    return (
      <Button href="/account" size={variant === "desktop" ? "md" : "sm"}>
        Account
      </Button>
    );
  }

  return (
    <Button href="/login" size={variant === "desktop" ? "md" : "sm"}>
      Login
    </Button>
  );
}

export default SignIn;
