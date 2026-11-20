"""
Script xử lý và tiền xử lý tập dữ liệu PlantVillage (14 loại cây, 26 loại bệnh).
Đáp ứng Checkpoint 1 trong tiến độ đồ án (Tuần 1.2).
"""

import os
import glob
import pandas as pd
from sklearn.model_selection import train_test_split

TARGET_CROPS = [
    "Apple", "Blueberry", "Cherry", "Corn", "Grape", "Orange",
    "Peach", "Pepper_bell", "Potato", "Raspberry", "Soybean",
    "Squash", "Strawberry", "Tomato"
]

def build_manifest(raw_data_dir: str, output_csv: str = "data/processed/plantvillage_manifest.csv"):
    records = []
    print(f"Scanning raw images in: {raw_data_dir}")
    
    for class_folder in sorted(os.listdir(raw_data_dir)):
        folder_path = os.path.join(raw_data_dir, class_folder)
        if not os.path.isdir(folder_path):
            continue
            
        parts = class_folder.split("___")
        if len(parts) == 2:
            crop, disease = parts[0], parts[1]
        else:
            crop, disease = "Unknown", class_folder
            
        images = glob.glob(os.path.join(folder_path, "*.*"))
        for img_path in images:
            records.append({
                "image_path": img_path,
                "crop": crop,
                "disease": disease,
                "label": class_folder
            })

    df = pd.DataFrame(records)
    print(f"Total images found: {len(df)}")
    
    # Stratified Train/Val Split (80/20)
    train_df, val_df = train_test_split(df, test_size=0.2, stratify=df['label'], random_state=42)
    train_df['split'] = 'train'
    val_df['split'] = 'val'
    
    full_manifest = pd.concat([train_df, val_df], ignore_index=True)
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    full_manifest.to_csv(output_csv, index=False)
    print(f"Saved manifest to {output_csv} with {len(train_df)} train & {len(val_df)} val samples.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", type=str, default="data/plantvillage/raw")
    parser.add_argument("--output", type=str, default="data/processed/manifest.csv")
    args = parser.parse_args()
    build_manifest(args.data_dir, args.output)

