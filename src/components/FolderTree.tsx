'use client';

import { useState } from 'react';
import type { FileInfo } from '../../electron/ipc/types';

interface TreeFolder {
    name: string;
    path: string;
    files: FileInfo[];
    subfolders: TreeFolder[];
    depth: number;
}

interface FolderTreeProps {
    folders: TreeFolder[];
    selectedPaths: Set<string>;
    onToggleFolder: (folderPath: string) => void;
    onToggleFile: (filePath: string) => void;
}

function TreeNode({
    folder,
    selectedPaths,
    onToggleFolder,
    onToggleFile,
}: {
    folder: TreeFolder;
    selectedPaths: Set<string>;
    onToggleFolder: (path: string) => void;
    onToggleFile: (path: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate selection state for this folder
    const allFilesInFolder: string[] = [];
    const collectFiles = (f: TreeFolder) => {
        f.files.forEach(file => allFilesInFolder.push(file.path));
        f.subfolders.forEach(sub => collectFiles(sub));
    };
    collectFiles(folder);

    const selectedFilesCount = allFilesInFolder.filter(p => selectedPaths.has(p)).length;
    const allSelected = allFilesInFolder.length > 0 && selectedFilesCount === allFilesInFolder.length;
    const someSelected = selectedFilesCount > 0 && selectedFilesCount < allFilesInFolder.length;

    const hasContent = folder.files.length > 0 || folder.subfolders.length > 0;

    return (
        <div className="select-none">
            {/* Folder Header */}
            <div
                className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer group"
                onClick={() => {
                    if (hasContent) {
                        setIsExpanded(!isExpanded);
                    }
                }}
            >
                {/* Expand/Collapse Arrow */}
                {hasContent && (
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''
                            }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                )}
                {!hasContent && <div className="w-4" />}

                {/* Checkbox */}
                <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                    }}
                    onChange={(e) => {
                        e.stopPropagation();
                        onToggleFolder(folder.path);
                    }}
                    className="checkbox"
                    style={{ accentColor: '#2596be' }}
                    onClick={(e) => e.stopPropagation()}
                />

                {/* Folder Icon */}
                <svg
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: allSelected ? '#00b2c8' : '#2596be' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                </svg>

                {/* Folder Name and Stats */}
                <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 text-sm">{folder.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        <span
                            className="px-1.5 py-0.5 rounded"
                            style={{
                                backgroundColor: allSelected
                                    ? 'rgba(0, 178, 200, 0.1)'
                                    : someSelected
                                        ? 'rgba(37, 150, 190, 0.1)'
                                        : 'rgba(156, 163, 175, 0.1)',
                                color: allSelected ? '#00b2c8' : someSelected ? '#2596be' : '#6b7280',
                            }}
                        >
                            {selectedFilesCount} / {allFilesInFolder.length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Nested Content */}
            {isExpanded && hasContent && (
                <div className="ml-4 border-l-2 border-gray-200 pl-2 mt-1">
                    {/* Files in this folder */}
                    {folder.files.map((file) => (
                        <div
                            key={file.path}
                            className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer"
                            onClick={() => onToggleFile(file.path)}
                        >
                            <div className="w-4" />
                            <input
                                type="checkbox"
                                checked={selectedPaths.has(file.path)}
                                onChange={() => onToggleFile(file.path)}
                                className="checkbox"
                                style={{ accentColor: '#2596be' }}
                                onClick={(e) => e.stopPropagation()}
                            />

                            {/* File Icon */}
                            {file.name.toLowerCase().endsWith('.pdf') ? (
                                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : file.name.toLowerCase().endsWith('.png') ? (
                                <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-900 truncate">{file.name}</div>
                                <div className="text-xs text-gray-500">
                                    {(file.size / 1024).toFixed(1)} KB • {file.name.split('.').pop()?.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Subfolders */}
                    {folder.subfolders.map((subfolder) => (
                        <TreeNode
                            key={subfolder.path}
                            folder={subfolder}
                            selectedPaths={selectedPaths}
                            onToggleFolder={onToggleFolder}
                            onToggleFile={onToggleFile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function FolderTree({ folders, selectedPaths, onToggleFolder, onToggleFile }: FolderTreeProps) {
    return (
        <div className="space-y-1">
            {folders.map((folder) => (
                <TreeNode
                    key={folder.path}
                    folder={folder}
                    selectedPaths={selectedPaths}
                    onToggleFolder={onToggleFolder}
                    onToggleFile={onToggleFile}
                />
            ))}
        </div>
    );
}

// Helper function to build tree structure from flat file list
export function buildFolderTree(files: FileInfo[], basePath: string): TreeFolder[] {
    if (files.length === 0) return [];

    // Use path module properly for cross-platform support
    const pathModule = typeof window !== 'undefined' ? {
        dirname: (p: string) => p.substring(0, p.lastIndexOf('\\')),
        relative: (from: string, to: string) => {
            // Simple relative path calculation
            if (to.startsWith(from)) {
                const rel = to.substring(from.length);
                return rel.startsWith('\\') || rel.startsWith('/') ? rel.substring(1) : rel;
            }
            return to;
        },
        sep: '\\',
        join: (...parts: string[]) => parts.filter(p => p).join('\\'),
    } : require('path');

    const folderMap = new Map<string, TreeFolder>();
    const rootFiles: FileInfo[] = [];

    // Group files by their directory
    files.forEach((file) => {
        const fileDir = pathModule.dirname(file.path);
        const relativePath = pathModule.relative(basePath, fileDir);

        if (!relativePath || relativePath === '.') {
            // File is directly in the root
            rootFiles.push(file);
        } else {
            // File is in a subfolder
            const parts = relativePath.split(/[\\/]/);

            // Create all ancestor folders
            for (let i = 0; i < parts.length; i++) {
                const folderPath = parts.slice(0, i + 1).join('\\');
                const folderName = parts[i];

                if (!folderMap.has(folderPath)) {
                    folderMap.set(folderPath, {
                        name: folderName,
                        path: folderPath,
                        files: [],
                        subfolders: [],
                        depth: i + 1,
                    });
                }
            }

            // Add file to its immediate parent folder
            const folderPath = parts.join('\\');
            const folder = folderMap.get(folderPath);
            if (folder) {
                folder.files.push(file);
            }
        }
    });

    // Build tree structure
    const tree: TreeFolder[] = [];

    // Add root folder if there are files at root level
    if (rootFiles.length > 0) {
        tree.push({
            name: 'Expense Backup (Root)',
            path: '(root)',
            files: rootFiles,
            subfolders: [],
            depth: 0,
        });
    }

    // Organize folders into tree hierarchy
    const rootLevelFolders: TreeFolder[] = [];

    folderMap.forEach((folder, folderPath) => {
        const parts = folderPath.split('\\');

        if (parts.length === 1) {
            // This is a top-level subfolder
            rootLevelFolders.push(folder);
        } else {
            // This is a nested subfolder - add to parent
            const parentPath = parts.slice(0, -1).join('\\');
            const parent = folderMap.get(parentPath);

            if (parent) {
                parent.subfolders.push(folder);
            }
        }
    });

    // Add top-level folders to tree
    tree.push(...rootLevelFolders.sort((a, b) => a.name.localeCompare(b.name)));

    // Sort subfolders recursively
    const sortSubfolders = (folder: TreeFolder) => {
        folder.subfolders.sort((a, b) => a.name.localeCompare(b.name));
        folder.subfolders.forEach(sortSubfolders);
    };

    tree.forEach(sortSubfolders);

    return tree;
}


