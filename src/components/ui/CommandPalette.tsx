"use client";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export interface CommandActionItem {
  id: string;
  group: string;
  label: string;
  hint?: string;
  keywords?: string;
  shortcut?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export type CommandItem = CommandActionItem;

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandActionItem[];
  placeholder?: string;
  emptyText?: string;
}

/**
 * 基于官方 shadcn/ui + cmdk 的标准全局命令面板（⌘K）
 */
export default function CommandPalette({
  open,
  onClose,
  items,
  placeholder = "输入页面、操作或目录名称...",
  emptyText = "未找到匹配结果",
}: CommandPaletteProps) {
  const groups = Array.from(new Set(items.map((i) => i.group)));

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Command>
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>{emptyText}</CommandEmpty>
          {groups.map((grp) => (
            <CommandGroup key={grp} heading={grp}>
              {items
                .filter((i) => i.group === grp)
                .map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} ${item.hint || ""} ${item.keywords || ""} ${item.group}`}
                    onSelect={() => {
                      item.onSelect();
                      onClose();
                    }}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                    {item.hint && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">{item.hint}</span>
                    )}
                    {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
