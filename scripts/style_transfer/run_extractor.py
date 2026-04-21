from style_transfer.extract_style_dna import process_video
import sys

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python run_extractor.py <reference_video> <out_dir>')
        sys.exit(1)
    video = sys.argv[1]
    out = sys.argv[2]
    res = process_video(video, out)
    if not res.get('success'):
        print('Extractor failed:', res.get('error'))
        sys.exit(2)
    print('Extractor finished:', res)
