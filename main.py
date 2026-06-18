"""
Ocean Floor Mapper — CLI Entry Point
"""
import argparse
import sys
from pathlib import Path

from utils.config_manager import ConfigManager
from utils.logger import get_logger
from automation.survey_pipeline import SurveyPipeline

logger = get_logger(__name__)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Ocean Floor Mapper — Unified sonar survey pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --sonar data/raw/scan1.xyx --gps data/raw/gps.csv
  python main.py --sonar data/raw/*.s7k --gps data/raw/gps.gpx --output data/outputs/survey_01
  python main.py --sonar data/raw/scan1.xyx --gps data/raw/gps.csv --skip-arcgis --skip-qgis
        """,
    )

    parser.add_argument(
        "--sonar",
        nargs="+",
        required=True,
        help="Path(s) to sonar data files (.xyx, .s7k, .all, .jsf)",
    )
    parser.add_argument(
        "--gps",
        required=True,
        help="Path to GPS/navigation file (.gpx, .csv, .nmea)",
    )
    parser.add_argument(
        "--output",
        default="./data/outputs",
        help="Output directory (default: ./data/outputs)",
    )
    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Path to config file (default: config.yaml)",
    )
    parser.add_argument(
        "--contour-interval",
        type=float,
        default=0.5,
        help="Depth contour interval in meters (default: 0.5)",
    )
    parser.add_argument(
        "--skip-arcgis",
        action="store_true",
        help="Skip ArcGIS export step",
    )
    parser.add_argument(
        "--skip-qgis",
        action="store_true",
        help="Skip QGIS visualization step",
    )
    parser.add_argument(
        "--skip-report",
        action="store_true",
        help="Skip PDF report generation",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate inputs and config without running the pipeline",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose/debug logging",
    )

    return parser


def validate_inputs(args: argparse.Namespace) -> bool:
    errors = []
    for sonar_file in args.sonar:
        p = Path(sonar_file)
        if not p.exists():
            errors.append(f"Sonar file not found: {sonar_file}")
    gps_path = Path(args.gps)
    if not gps_path.exists():
        errors.append(f"GPS file not found: {args.gps}")
    if errors:
        for e in errors:
            logger.error(e)
        return False
    return True


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.verbose:
        import logging
        logging.getLogger().setLevel(logging.DEBUG)

    logger.info("Ocean Floor Mapper starting")

    # Load config
    config_path = Path(args.config)
    if not config_path.exists():
        logger.warning(
            f"Config file '{args.config}' not found — using defaults. "
            "Copy config.yaml.example to config.yaml to customize."
        )
        config = {}
    else:
        config = ConfigManager(str(config_path)).load()

    # Validate inputs
    if not validate_inputs(args):
        return 1

    if args.dry_run:
        logger.info("Dry run — all inputs valid. Pipeline would run with:")
        logger.info(f"  Sonar files : {args.sonar}")
        logger.info(f"  GPS file    : {args.gps}")
        logger.info(f"  Output dir  : {args.output}")
        return 0

    # Run pipeline
    pipeline = SurveyPipeline(
        config=config,
        output_dir=args.output,
        use_arcgis=not args.skip_arcgis,
        use_qgis=not args.skip_qgis,
        generate_report=not args.skip_report,
        contour_interval=args.contour_interval,
    )

    try:
        results = pipeline.run(sonar_files=args.sonar, gps_file=args.gps)
        logger.info("Pipeline complete!")
        logger.info(f"  Mosaic    : {results.get('mosaic', 'N/A')}")
        logger.info(f"  Contours  : {results.get('contours', 'N/A')}")
        logger.info(f"  Targets   : {results.get('targets_count', 0)} detected")
        logger.info(f"  Report    : {results.get('report', 'N/A')}")
        return 0
    except Exception as exc:
        logger.error(f"Pipeline failed: {exc}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())
