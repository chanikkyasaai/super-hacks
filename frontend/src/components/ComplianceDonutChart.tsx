import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const ComplianceDonutChart = ({ percentage }: { percentage: number }) => {
  const data = [
    { name: 'Compliant', value: percentage },
    { name: 'Non-Compliant', value: 100 - percentage },
  ];

  const COLORS = ['hsl(var(--success))', 'hsl(var(--muted))'];

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl font-bold text-foreground">{percentage}%</div>
          <div className="text-sm text-muted-foreground">Compliant</div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceDonutChart;
