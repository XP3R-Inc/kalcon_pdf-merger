import path from 'path';
import type { FileInfo } from '../../electron/ipc/types';
import type { BackupFolder } from './types';

interface FolderNode {
    path: string;
    name: string;
    fullPath: string;
    files: FileInfo[];
    depth: number;
    parent: string | null;
}

/**
 * Organize backup files by their containing folder hierarchy
 */
export function organizeBackupsByFolder(
    backupFiles: FileInfo[],
    backupBasePath: string
): BackupFolder[] {
    const folderMap = new Map<string, FolderNode>();

    // Group files by their immediate parent folder
    backupFiles.forEach((file) => {
        const fileDir = path.dirname(file.path);
        const relativePath = path.relative(backupBasePath, fileDir);
        const folderKey = relativePath || '(root)';

        if (!folderMap.has(folderKey)) {
            // Determine depth by counting path separators
            const depth = folderKey === '(root)' ? 0 : folderKey.split(path.sep).length;

            // Determine parent folder
            let parent: string | null = null;
            if (folderKey !== '(root)' && depth > 1) {
                const parentPath = path.dirname(folderKey);
                parent = parentPath === '.' ? '(root)' : parentPath;
            }

            folderMap.set(folderKey, {
                path: folderKey,
                name: folderKey === '(root)' ? 'Expense Backup (Root)' : path.basename(folderKey),
                fullPath: fileDir,
                files: [],
                depth,
                parent,
            });
        }
        folderMap.get(folderKey)!.files.push(file);
    });

    // Convert to array and sort hierarchically
    const folders: BackupFolder[] = Array.from(folderMap.values())
        .map((node) => ({
            path: node.path,
            name: node.name,
            files: node.files,
            selected: true,
            depth: node.depth,
            parent: node.parent,
            fullPath: node.fullPath,
        }))
        .sort((a, b) => {
            // Sort by path to maintain hierarchy
            return a.path.localeCompare(b.path);
        });

    return folders;
}

/**
 * Get display name with proper indentation for hierarchy
 */
export function getFolderDisplayName(folder: BackupFolder): string {
    const indent = '  '.repeat(folder.depth || 0);
    return `${indent}${folder.name}`;
}

/**
 * Get all subfolders of a given folder path
 */
export function getSubfolders(folders: BackupFolder[], parentPath: string): BackupFolder[] {
    return folders.filter((folder) => folder.parent === parentPath);
}

/**
 * Get all file paths from selected folders
 */
export function getSelectedFilePaths(
    folders: BackupFolder[],
    selectedFolderPaths: Set<string>
): string[] {
    const paths: string[] = [];

    folders.forEach((folder) => {
        if (selectedFolderPaths.has(folder.path)) {
            folder.files.forEach((file) => {
                paths.push(file.path);
            });
        }
    });

    return paths;
}

