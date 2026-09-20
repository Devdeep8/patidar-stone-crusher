// src/common/navigation.ts
// Single source of truth for the sidebar structure. Every section/item
// declares the permission needed to see it — the sidebar filters by the
// signed-in admin's role. Add a page = add an entry here.
import {
  IconArticle,
  IconLayoutDashboard,
  IconNotes
} from "@tabler/icons-react";
import type { Permission } from "./permissions";

export type NavIcon = React.ComponentType<{ className?: string }>;

export type NavItem = {
  title: string;
  url: string;
  icon?: NavIcon;
  permission: Permission;
};

// A section either links directly (no items) or expands into sub-items
export type NavSection = NavItem & {
  items?: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: IconLayoutDashboard,
    permission: "dashboard.view"
  },
  {
    title: "CMS",
    url: "/cms",
    icon: IconNotes,
    permission: "cms.view",
    items: [
      {
        title: "Blogs",
        url: "/cms/blogs",
        icon: IconArticle,
        permission: "cms.blogs.view"
      }
    ]
  }
];
