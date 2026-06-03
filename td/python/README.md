# person_detect.py

TouchDesigner (Spout) → YOLO人物検知 → OSC → TouchDesigner

## セットアップ

```bash
# uvがなければインストール
winget install astral-sh.uv

# td/python ディレクトリで
cd td/python
uv sync
```

## 実行

```bash
uv run python person_detect.py
```

## 設定 (person_detect.py 上部)

| 変数 | 説明 | デフォルト |
|---|---|---|
| `SPOUT_SENDER_NAME` | TDのSpout出力の送信者名 | `"TouchDesigner"` |
| `YOLO_MODEL` | YOLOモデルファイル | `"yolo11s.pt"` |
| `CONF_THRES` | 検出信頼度閾値 | `0.35` |
| `OSC_HOST` | OSC送信先IP | `"127.0.0.1"` |
| `OSC_PORT` | OSC送信先ポート (TDのOSC In CHOP) | `7000` |

## OSCメッセージ仕様

| アドレス | 型 | 内容 |
|---|---|---|
| `/person/count` | int | 検出人数 |
| `/person/<i>/bbox` | float × 4 | x1 y1 x2 y2 (0〜1正規化) |
| `/person/<i>/center` | float × 2 | cx cy (0〜1正規化) |

## TouchDesigner側の設定

1. **Spout出力**: `TOP` → `Spout Out TOP`、送信者名を`SPOUT_SENDER_NAME`と一致させる
2. **OSC受信**: `OSC In CHOP`、ポートを`OSC_PORT`と一致させる
