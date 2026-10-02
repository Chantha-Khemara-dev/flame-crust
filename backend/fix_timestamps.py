import os
import glob

directory = "src/main/java/com/flamecrust/api/model"
for filepath in glob.glob(os.path.join(directory, "*.java")):
    with open(filepath, "r") as f:
        content = f.read()

    changed = False

    if "private LocalDateTime createdAt;" in content and "@CreationTimestamp" not in content:
        content = content.replace("private LocalDateTime createdAt;", "@org.hibernate.annotations.CreationTimestamp\n    private LocalDateTime createdAt;")
        changed = True

    if "private LocalDateTime updatedAt;" in content and "@UpdateTimestamp" not in content:
        content = content.replace("private LocalDateTime updatedAt;", "@org.hibernate.annotations.UpdateTimestamp\n    private LocalDateTime updatedAt;")
        changed = True

    if changed:
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Fixed {filepath}")

print("Done!")
