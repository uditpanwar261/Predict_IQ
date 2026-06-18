from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
import csv, io
from datetime import datetime
from machines.models import Machine
from sensors.models import SensorReading
from predictions.models import Prediction
from alerts.models import Alert

class ExportSensorCSVView(APIView):
    def get(self, request, machine_id):
        try:
            machine = Machine.objects.get(pk=machine_id)
        except Machine.DoesNotExist:
            return Response({'error': 'Machine not found'}, status=404)

        readings = SensorReading.objects.filter(machine=machine).order_by('-timestamp')[:1000]
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Timestamp', 'Temperature (°C)', 'Vibration (mm/s)', 'Pressure (Bar)',
                         'Current (A)', 'RPM', 'Oil Level (%)', 'Noise (dB)', 'Is Anomaly', 'Anomaly Score'])
        for r in readings:
            writer.writerow([r.timestamp, r.temperature, r.vibration, r.pressure,
                             r.current, r.rpm, r.oil_level, r.noise_level, r.is_anomaly, r.anomaly_score])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{machine.name}_sensors_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response

class ExportPredictionsCSVView(APIView):
    def get(self, request):
        machine_id = request.query_params.get('machine')
        qs = Prediction.objects.select_related('machine').order_by('-predicted_at')[:500]
        if machine_id: qs = qs.filter(machine_id=machine_id)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Machine', 'Predicted At', 'Failure Probability (%)', 'Will Fail in 7 Days',
                         'Est. Days to Failure', 'Confidence Score (%)'])
        for p in qs:
            writer.writerow([p.machine.name, p.predicted_at, p.failure_probability,
                             p.will_fail_within_7days, p.estimated_days_to_failure, p.confidence_score])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="predictions_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response

class ExportAlertsCSVView(APIView):
    def get(self, request):
        alerts = Alert.objects.select_related('machine').order_by('-created_at')[:500]
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Machine', 'Type', 'Severity', 'Status', 'Title', 'Message', 'Created At'])
        for a in alerts:
            writer.writerow([a.machine.name, a.alert_type, a.severity, a.status,
                             a.title, a.message, a.created_at])
        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="alerts_{datetime.now().strftime("%Y%m%d")}.csv"'
        return response

class ExportPDFReportView(APIView):
    def get(self, request, machine_id):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
            from reportlab.lib.units import inch
        except ImportError:
            return Response({'error': 'ReportLab not available'}, status=500)

        try:
            machine = Machine.objects.get(pk=machine_id)
        except Machine.DoesNotExist:
            return Response({'error': 'Machine not found'}, status=404)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
        styles = getSampleStyleSheet()
        story = []

        title_style = ParagraphStyle('Title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#1e40af'))
        h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#374151'))

        story.append(Paragraph(f'Machine Health Report', title_style))
        story.append(Paragraph(f'{machine.name}', styles['Heading1']))
        story.append(Paragraph(f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M UTC")}', styles['Normal']))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e5e7eb')))
        story.append(Spacer(1, 12))

        story.append(Paragraph('Machine Overview', h2_style))
        machine_data = [
            ['Property', 'Value'],
            ['Type', machine.get_machine_type_display()],
            ['Location', machine.location],
            ['Status', machine.status.upper()],
            ['Health Score', f'{machine.health_score}/100'],
            ['Health Status', machine.health_status.upper()],
            ['Installed', str(machine.install_date)],
        ]
        t = Table(machine_data, colWidths=[2*inch, 4*inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')]),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
        ]))
        story.append(t)
        story.append(Spacer(1, 16))

        # Latest reading
        reading = SensorReading.objects.filter(machine=machine).first()
        if reading:
            story.append(Paragraph('Latest Sensor Readings', h2_style))
            sensor_data = [
                ['Sensor', 'Value', 'Unit'],
                ['Temperature', str(reading.temperature), '°C'],
                ['Vibration', str(reading.vibration), 'mm/s'],
                ['Pressure', str(reading.pressure), 'Bar'],
                ['Current', str(reading.current), 'A'],
                ['RPM', str(reading.rpm), 'RPM'],
                ['Oil Level', str(reading.oil_level), '%'],
                ['Noise Level', str(reading.noise_level), 'dB'],
            ]
            t2 = Table(sensor_data, colWidths=[2.5*inch, 2*inch, 1.5*inch])
            t2.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#065f46')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fdf4')]),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            story.append(t2)
            story.append(Spacer(1, 16))

        # Latest prediction
        pred = Prediction.objects.filter(machine=machine).first()
        if pred:
            story.append(Paragraph('AI Failure Prediction', h2_style))
            pred_data = [
                ['Metric', 'Value'],
                ['Failure Probability', f'{pred.failure_probability}%'],
                ['Will Fail in 7 Days', 'YES' if pred.will_fail_within_7days else 'NO'],
                ['Est. Days to Failure', str(pred.estimated_days_to_failure) if pred.estimated_days_to_failure else 'N/A'],
                ['Confidence Score', f'{pred.confidence_score}%'],
                ['Predicted At', pred.predicted_at.strftime('%Y-%m-%d %H:%M')],
            ]
            t3 = Table(pred_data, colWidths=[2.5*inch, 3.5*inch])
            t3.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#7c3aed')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf5ff')]),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
            ]))
            story.append(t3)
            story.append(Spacer(1, 12))
            if pred.recommendations:
                story.append(Paragraph('AI Maintenance Recommendations', h2_style))
                for rec in pred.recommendations:
                    story.append(Paragraph(f'• {rec}', styles['Normal']))
                story.append(Spacer(1, 8))

        doc.build(story)
        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{machine.name}_report_{datetime.now().strftime("%Y%m%d")}.pdf"'
        return response
