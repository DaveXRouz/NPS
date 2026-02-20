import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "../UserCard";
import type { OracleUser } from "@/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "oracle.edit_profile": "Edit Profile",
        "oracle.delete_profile": "Delete Profile",
        "oracle.gender_male": "Male",
        "oracle.gender_female": "Female",
      };
      return map[key] ?? key;
    },
  }),
}));

const fullUser: OracleUser = {
  id: 1,
  name: "Alice",
  name_persian: "\u0622\u0644\u06CC\u0633",
  birthday: "1990-01-15",
  mother_name: "Carol",
  country: "US",
  city: "NYC",
  gender: "female",
  heart_rate_bpm: 72,
  timezone_hours: 3,
  timezone_minutes: 30,
  latitude: 40.7128,
  longitude: -74.006,
  created_at: "2024-01-01T00:00:00Z",
};

const minimalUser: OracleUser = {
  id: 2,
  name: "Bob",
  birthday: "1985-06-20",
  mother_name: "Diana",
};

describe("UserCard", () => {
  it("renders user name and Persian name", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("\u0622\u0644\u06CC\u0633")).toBeInTheDocument();
    const persianEl = screen.getByText("\u0622\u0644\u06CC\u0633");
    expect(persianEl).toHaveAttribute("dir", "rtl");
  });

  it("renders birthday", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByTestId("user-birthday")).toHaveTextContent("1990-01-15");
  });

  it("renders location when country and city are set", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByTestId("user-location")).toHaveTextContent("US, NYC");
  });

  it("renders gender badge", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByTestId("gender-badge");
    expect(badge).toHaveTextContent("Female");
  });

  it("renders heart rate indicator", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByTestId("heart-rate-badge");
    expect(badge).toHaveTextContent("72");
  });

  it("renders timezone as UTC offset", () => {
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const badge = screen.getByTestId("timezone-badge");
    expect(badge).toHaveTextContent("UTC+3:30");
  });

  it("renders gracefully when optional fields are missing", () => {
    render(<UserCard user={minimalUser} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByTestId("user-birthday")).toHaveTextContent("1985-06-20");
    expect(screen.queryByTestId("user-location")).not.toBeInTheDocument();
    expect(screen.queryByTestId("gender-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("heart-rate-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("timezone-badge")).not.toBeInTheDocument();
  });

  it("fires onEdit callback when edit button clicked", async () => {
    const onEdit = vi.fn();
    render(<UserCard user={fullUser} onEdit={onEdit} onDelete={vi.fn()} />);
    await userEvent.click(screen.getByTestId("edit-user-1"));
    expect(onEdit).toHaveBeenCalledWith(fullUser);
  });

  it("fires onDelete callback when delete button clicked", async () => {
    const onDelete = vi.fn();
    render(<UserCard user={fullUser} onEdit={vi.fn()} onDelete={onDelete} />);
    await userEvent.click(screen.getByTestId("delete-user-1"));
    expect(onDelete).toHaveBeenCalledWith(fullUser);
  });

  it("shows visual highlight when isSelected is true", () => {
    const { container, rerender } = render(
      <UserCard user={fullUser} onEdit={vi.fn()} onDelete={vi.fn()} />,
    );
    const card = container.querySelector("[role='article']")!;
    expect(card.className).toContain("border-[var(--nps-glass-border)]");

    rerender(
      <UserCard
        user={fullUser}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isSelected
      />,
    );
    const selectedCard = container.querySelector("[role='article']")!;
    expect(selectedCard.className).toContain("border-[var(--nps-accent)]");
  });
});
